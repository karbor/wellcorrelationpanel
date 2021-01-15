// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
//
// Copyright (C) 2020 - Equinor ASA.

precision highp float;

uniform sampler2D tSoftShadow;
uniform sampler2D tAmbient;
uniform vec2 resolution;

void main() {

    vec2 ires = 1.0 / resolution;
    vec4 softShadowColors = texture2D(tSoftShadow, ires * gl_FragCoord.xy).rgba;

    float softShadow = softShadowColors.r;
    float ambient = texture2D(tAmbient, ires * gl_FragCoord.xy).r;

    // float l = 4.0 * softShadow + 0.25 * ambient;
    float l = 1.0 * softShadow + 0.25 * ambient;
    gl_FragColor = vec4(l,l,l, softShadowColors.a);
}