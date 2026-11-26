/**
 * Zawgyi -> Unicode conversion rules, vendored from Rabbit-Node v1.0.4
 * https://github.com/Rabbit-Converter/Rabbit-Node
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Rabbit-Converter
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

const RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [new RegExp("\u200b", 'g'), ""],
  [new RegExp("(\u103d|\u1087)", 'g'), "\u103e"],
  [new RegExp("\u103c", 'g'), "\u103d"],
  [new RegExp("(\u103b|\u107e|\u107f|\u1080|\u1081|\u1082|\u1083|\u1084)", 'g'), "\u103c"],
  [new RegExp("(\u103a|\u107d)", 'g'), "\u103b"],
  [new RegExp("\u1039", 'g'), "\u103a"],
  [new RegExp("(\u1066|\u1067)", 'g'), "\u1039\u1006"],
  [new RegExp("\u106a", 'g'), "\u1009"],
  [new RegExp("\u106b", 'g'), "\u100a"],
  [new RegExp("\u106c", 'g'), "\u1039\u100b"],
  [new RegExp("\u106d", 'g'), "\u1039\u100c"],
  [new RegExp("\u106e", 'g'), "\u100d\u1039\u100d"],
  [new RegExp("\u106f", 'g'), "\u100d\u1039\u100e"],
  [new RegExp("\u1070", 'g'), "\u1039\u100f"],
  [new RegExp("(\u1071|\u1072)", 'g'), "\u1039\u1010"],
  [new RegExp("\u1060", 'g'), "\u1039\u1000"],
  [new RegExp("\u1061", 'g'), "\u1039\u1001"],
  [new RegExp("\u1062", 'g'), "\u1039\u1002"],
  [new RegExp("\u1063", 'g'), "\u1039\u1003"],
  [new RegExp("\u1065", 'g'), "\u1039\u1005"],
  [new RegExp("\u1068", 'g'), "\u1039\u1007"],
  [new RegExp("\u1069", 'g'), "\u1039\u1008"],
  [new RegExp("(\u1073|\u1074)", 'g'), "\u1039\u1011"],
  [new RegExp("\u1075", 'g'), "\u1039\u1012"],
  [new RegExp("\u1076", 'g'), "\u1039\u1013"],
  [new RegExp("\u1077", 'g'), "\u1039\u1014"],
  [new RegExp("\u1078", 'g'), "\u1039\u1015"],
  [new RegExp("\u1079", 'g'), "\u1039\u1016"],
  [new RegExp("\u107a", 'g'), "\u1039\u1017"],
  [new RegExp("\u107c", 'g'), "\u1039\u1019"],
  [new RegExp("\u1085", 'g'), "\u1039\u101c"],
  [new RegExp("\u1033", 'g'), "\u102f"],
  [new RegExp("\u1034", 'g'), "\u1030"],
  [new RegExp("\u103f", 'g'), "\u1030"],
  [new RegExp("\u1086", 'g'), "\u103f"],
  [new RegExp("\u1036\u1088", 'g'), "\u1088\u1036"],
  [new RegExp("\u1088", 'g'), "\u103e\u102f"],
  [new RegExp("\u1089", 'g'), "\u103e\u1030"],
  [new RegExp("\u108a", 'g'), "\u103d\u103e"],
  [new RegExp("\u103b\u1064", 'g'), "\u1064\u103b"],
  [new RegExp("(\u1031)?([\u1000-\u1021])\u1064", 'g'), "\u1004\u103a\u1039$1$2"],
  [new RegExp("(\u1031)?([\u1000-\u1021])\u108b", 'g'), "\u1004\u103a\u1039$1$2\u102d"],
  [new RegExp("(\u1031)?([\u1000-\u1021])\u108c", 'g'), "\u1004\u103a\u1039$1$2\u102e"],
  [new RegExp("(\u1031)?([\u1000-\u1021])\u108d", 'g'), "\u1004\u103a\u1039$1$2\u1036"],
  [new RegExp("\u108e", 'g'), "\u102d\u1036"],
  [new RegExp("\u108f", 'g'), "\u1014"],
  [new RegExp("\u1090", 'g'), "\u101b"],
  [new RegExp("\u1091", 'g'), "\u100f\u1039\u100d"],
  [new RegExp("\u1019\u102c(\u107b|\u1093)", 'g'), "\u1019\u1039\u1018\u102c"],
  [new RegExp("(\u107b|\u1093)", 'g'), "\u1039\u1018"],
  [new RegExp("(\u1094|\u1095)", 'g'), "\u1037"],
  [new RegExp("([\u1000-\u1021])\u1037\u1032", 'g'), "$1\u1032\u1037"],
  [new RegExp("\u1096", 'g'), "\u1039\u1010\u103d"],
  [new RegExp("\u1097", 'g'), "\u100b\u1039\u100b"],
  [new RegExp("\u103c([\u1000-\u1021])([\u1000-\u1021])?", 'g'), "$1\u103c$2"],
  [new RegExp("([\u1000-\u1021])\u103c\u103a", 'g'), "\u103c$1\u103a"],
  [new RegExp("\u1047(?=[\u102c-\u1030\u1032\u1036-\u1038\u103d\u1038])", 'g'), "\u101b"],
  [new RegExp("\u1031\u1047", 'g'), "\u1031\u101b"],
  [new RegExp("\u1040(\u102e|\u102f|\u102d\u102f|\u1030|\u1036|\u103d|\u103e)", 'g'), "\u101d$1"],
  [new RegExp("([^\u1040\u1041\u1042\u1043\u1044\u1045\u1046\u1047\u1048\u1049])\u1040\u102b", 'g'), "$1\u101d\u102b"],
  [new RegExp("([\u1040\u1041\u1042\u1043\u1044\u1045\u1046\u1047\u1048\u1049])\u1040\u102b(?!\u1038)", 'g'), "$1\u101d\u102b"],
  [new RegExp("^\u1040(?=\u102b)", 'g'), "\u101d"],
  [new RegExp("\u1040\u102d(?! ?/)", 'g'), "\u101d\u102d"],
  [new RegExp("([^\u1040-\u1049])\u1040([^\u1040-\u1049 ]|[\u104a\u104b])", 'g'), "$1\u101d$2"],
  [new RegExp("([^\u1040-\u1049])\u1040(?=[\\f\\n\\r])", 'g'), "$1\u101d"],
  [new RegExp("([^\u1040-\u1049])\u1040$", 'g'), "$1\u101d"],
  [new RegExp("\u1031([\u1000-\u1021])(\u103e)?(\u103b)?", 'g'), "$1$2$3\u1031"],
  [new RegExp("([\u1000-\u1021])\u1031([\u103b\u103c\u103d\u103e]+)", 'g'), "$1$2\u1031"],
  [new RegExp("\u1032\u103d", 'g'), "\u103d\u1032"],
  [new RegExp("([\u102d\u102e])\u103b", 'g'), "\u103b$1"],
  [new RegExp("\u103d\u103b", 'g'), "\u103b\u103d"],
  [new RegExp("\u103a\u1037", 'g'), "\u1037\u103a"],
  [new RegExp("\u102f(\u102d|\u102e|\u1036|\u1037)\u102f", 'g'), "\u102f$1"],
  [new RegExp("(\u102f|\u1030)(\u102d|\u102e)", 'g'), "$2$1"],
  [new RegExp("(\u103e)(\u103b|\u103c)", 'g'), "$2$1"],
  [new RegExp("\u1025(?=[\u1037]?[\u103a\u102c])", 'g'), "\u1009"],
  [new RegExp("\u1025\u102e", 'g'), "\u1026"],
  [new RegExp("\u1005\u103b", 'g'), "\u1008"],
  [new RegExp("\u1036(\u102f|\u1030)", 'g'), "$1\u1036"],
  [new RegExp("\u1031\u1037\u103e", 'g'), "\u103e\u1031\u1037"],
  [new RegExp("\u1031\u103e\u102c", 'g'), "\u103e\u1031\u102c"],
  [new RegExp("\u105a", 'g'), "\u102b\u103a"],
  [new RegExp("\u1031\u103b\u103e", 'g'), "\u103b\u103e\u1031"],
  [new RegExp("(\u102d|\u102e)(\u103d|\u103e)", 'g'), "$2$1"],
  [new RegExp("\u102c\u1039([\u1000-\u1021])", 'g'), "\u1039$1\u102c"],
  [new RegExp("\u103c\u1004\u103a\u1039([\u1000-\u1021])", 'g'), "\u1004\u103a\u1039$1\u103c"],
  [new RegExp("\u1039\u103c\u103a\u1039([\u1000-\u1021])", 'g'), "\u103a\u1039$1\u103c"],
  [new RegExp("\u103c\u1039([\u1000-\u1021])", 'g'), "\u1039$1\u103c"],
  [new RegExp("\u1036\u1039([\u1000-\u1021])", 'g'), "\u1039$1\u1036"],
  [new RegExp("\u1092", 'g'), "\u100b\u1039\u100c"],
  [new RegExp("\u104e", 'g'), "\u104e\u1004\u103a\u1038"],
  [new RegExp("\u1040(\u102b|\u102c|\u1036)", 'g'), "\u101d$1"],
  [new RegExp("\u1025\u1039", 'g'), "\u1009\u1039"],
  [new RegExp("([\u1000-\u1021])\u103c\u1031\u103d", 'g'), "$1\u103c\u103d\u1031"],
  [new RegExp("([\u1000-\u1021])\u103b\u1031\u103d(\u103e)?", 'g'), "$1\u103b\u103d$2\u1031"],
  [new RegExp("([\u1000-\u1021])\u103d\u1031\u103b", 'g'), "$1\u103b\u103d\u1031"],
  [new RegExp("([\u1000-\u1021])\u1031(\u1039[\u1000-\u1021])", 'g'), "$1$2\u1031"],
  [new RegExp("\u1038\u103a", 'g'), "\u103a\u1038"],
  [new RegExp("\u102d\u103a|\u103a\u102d", 'g'), "\u102d"],
  [new RegExp("\u102d\u102f\u103a", 'g'), "\u102d\u102f"],
  [new RegExp(" \u1037", 'g'), "\u1037"],
  [new RegExp("\u1037\u1036", 'g'), "\u1036\u1037"],
  [new RegExp(" \u1037", 'g'), "\u1037"],
  [new RegExp("[\u102d]+", 'g'), "\u102d"],
  [new RegExp("[\u103a]+", 'g'), "\u103a"],
  [new RegExp("[\u103d]+", 'g'), "\u103d"],
  [new RegExp("[\u1037]+", 'g'), "\u1037"],
  [new RegExp("[\u102e]+", 'g'), "\u102e"],
  [new RegExp("\u102d\u102e|\u102e\u102d", 'g'), "\u102e"],
  [new RegExp("\u102f\u102d", 'g'), "\u102d\u102f"],
  [new RegExp("\u1037\u1037", 'g'), "\u1037"],
  [new RegExp("\u1032\u1032", 'g'), "\u1032"],
  [new RegExp("\u1044\u1004\u103a\u1038", 'g'), "\u104e\u1004\u103a\u1038"],
  [new RegExp("([\u102d\u102e])\u1039([\u1000-\u1021])", 'g'), "\u1039$2$1"],
  [new RegExp("\u1036\u103d", 'g'), "\u103d\u1036"],
];

/** Convert Zawgyi-encoded Burmese text to Unicode. Leaves ASCII untouched. */
export const zg2uni = (input: string): string =>
  RULES.reduce((text, [from, to]) => text.replace(from, to), input);
