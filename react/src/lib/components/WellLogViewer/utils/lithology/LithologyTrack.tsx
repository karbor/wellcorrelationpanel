import {setProps, StackedTrack} from "@equinor/videx-wellog";
import {StackedTrackOptions} from "@equinor/videx-wellog/dist/tracks/stack/interfaces";
import {PatternsTable} from "../pattern";
import {OnMountEvent, OnRescaleEvent, OnUpdateEvent} from "@equinor/videx-wellog/dist/tracks/interfaces";
import {Scale} from "@equinor/videx-wellog/dist/common/interfaces";
import {select} from "d3-selection";
import {getPatterns} from "./patterns";

export interface LithologyTrackDataRow {
    from: number, to: number, name?: string | number, color?: {r: number, g: number, b: number, a?:number}
}

export interface LithologyPatternsTable extends PatternsTable {
    patternCodes: (string|number)[];
}

export interface LithologyTrackOptions extends StackedTrackOptions {
    lithologyPatternsTable?: LithologyPatternsTable;
    data?: LithologyTrackDataRow[]
}

export class LithologyTrack extends StackedTrack{
    patternsTable: LithologyPatternsTable | undefined;
    patterns: Map<(string|number), (CanvasPattern|string)>;  // TODO: fix type
    ctx: CanvasRenderingContext2D | undefined;
    numberOfUniquePatternsLoading: number

    constructor(id: string | number,props: LithologyTrackOptions) {
        super(id, props);
        this.patternsTable = props.lithologyPatternsTable
        this.patterns = new Map<(string|number), (CanvasPattern|string)>();
        // this.patterns = this.loadPatterns.bind(this);
        this.numberOfUniquePatternsLoading = 0
        // this.loadPatterns = this.loadPatterns.bind(this)
        //this.loadPatterns();
        // this.patterns = this.setupPatterns(props.patternsTable)

    }

    loadPatterns () {
        const {
            data,
        } = this;
        if (!data) return;

        // Find unique canvas code names in data for this track. Later only load images for used codes
        const uniqueCodes = [...new Set(data.map((item: LithologyTrackDataRow) => item.name))] as (string|number)[]; // TODO: why doesn't typescript understand this itself?
        this.numberOfUniquePatternsLoading = uniqueCodes.length
        const patterns = getPatterns(uniqueCodes)
        console.log("patterns ", patterns)
        console.log(this.patternsTable)
        uniqueCodes.forEach(code => {
            const pattern = patterns.find(pattern => code === pattern.code)
            if (pattern?.patternImage) {
                // Check if we have loaded pattern
                if (!this.patterns.get(code)) {
                    // Temporarily set solid color while we get image to avoid fetching multiple times
                    this.patterns.set(code, 'green'); //'#eee';
                    // Create pattern
                    const patternImage = new Image(); // TODO: We do not have the width and height yet? Check rectWidth, rectHeight);
                    // TODO: use path from pattern.patternImage
                    patternImage.src = pattern.patternImage
                    // patternImage.src  = "static/media/src/demo/example-data/patterns/Anhydrite.gif"
                    // patternImage.src =  `data:image/svg+xml;base64,${pattern.patternImage}`;

                    patternImage.onload = () => {
                        this.patterns.set(code,this.ctx?.createPattern(patternImage, 'repeat') as CanvasPattern);
                        // console.log("patternImage loaded", code, patternImage)
                        this.numberOfUniquePatternsLoading -= 1;
                        if (this.numberOfUniquePatternsLoading <= 0) {
                            this.isLoading = false;
                            // resolve();
                        }
                        // console.log("image onload",code, this.patterns)
                    }
                } else {
              this.numberOfUniquePatternsLoading -= 1; // Already have pattern
            }
            } else {
                // We didn't have the image for the pattern, so we are no longer loading it.
                this.numberOfUniquePatternsLoading -= 1;
            }
            if (this.numberOfUniquePatternsLoading <= 0) {
                this.isLoading = false;
                // resolve();
            }
        })
    }


    onMount(trackEvent: OnMountEvent) : void {
        super.onMount(trackEvent);
        const canvas = select(trackEvent.elm).append('canvas').style('position', 'absolute');
        this.ctx = canvas.node()?.getContext('2d') ?? undefined;
        const {
          options,
        } = this;
        if (options.data) {
            options.data().then((data: any) => {
                this.data = data;
                // this.loadPatterns()
                this.loadPatterns() //.then(this.plot());
                this.plot();
              }, (error: Error | string) => super.onError(error));
            // TODO override plot
        }
    }

    plot() {
        const {
          ctx,
          scale: yscale,
          data, patterns,
        } = this;

        if (!ctx || !data) return;

        const rectangles = trimData(yscale, data);
        const {width: rectWidth, clientWidth, clientHeight } = ctx.canvas;
        ctx.clearRect(0, 0, clientWidth, clientHeight);
        rectangles.forEach((rectangle: any) => {
            // Save/restore to move the pattern, if not the pattern will look odd when scrolling
            ctx.save();
             // Translate context to draw position
            ctx.translate(0, rectangle.yFrom);

            // Draw rect at the origin of the context
            const rectHeight = rectangle.yTo - rectangle.yFrom;


            // const patternImage = new Image(rectWidth, rectHeight);
            // patternImage.src = "static/media/src/demo/example-data/patterns/Anhydrite.gif"
            // let tmp: any;
            // patternImage.onload = () => {
            //     tmp = ctx.createPattern(patternImage, 'repeat');
            // }
            // ctx.fillStyle = tmp
            ctx.fillStyle = patterns.get(rectangle.facies_name) || 'orange'; //'#eee';
            ctx.fillRect(0,0 , rectWidth, rectHeight);
            ctx.restore();
        });
    }

    onRescale(rescaleEvent: OnRescaleEvent) {
        super.onRescale(rescaleEvent);
        this.plot();
    }
    onUpdate(event: OnUpdateEvent) {
        super.onUpdate(event);
        // Copied from videx canvas track
        const {
          ctx,
          elm,
        } = this;

        if (ctx) {
          const canvas = select(ctx.canvas);
          const props = {
            styles: {
              width: `${elm.clientWidth}px`,
              height: `${elm.clientHeight}px`,
            },
            attrs: {
              width: elm.clientWidth,
              height: elm.clientHeight,
            },
          };
          setProps(canvas, props);
        }
        this.plot();
    }
    onDataLoaded() {
        this.loadPatterns();
        this.plot()
        // this.loadPatterns().then(this.plot());
    }
}

function trimData(scale: Scale, data: (Promise<any> | Function | any)) {
    if (!data) return [];
    function scale_to_and_from_depths (rect: any[], item: any) { //{from: number, to: number, name: string, color: [number, number, number]}) {
        rect.push({
            yFrom: scale(item.from),
            yTo: scale(item.to),
            facies_name: item.name
        });
        return rect;
    }
    const scaled_data = data.reduce(scale_to_and_from_depths, [])
    return scaled_data
}