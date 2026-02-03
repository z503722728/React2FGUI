"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationType = exports.VertAlignType = exports.AlignType = exports.LoaderFillType = exports.ObjectType = void 0;
/**
 * FGUI Object Types based on reverse engineered source.
 */
var ObjectType;
(function (ObjectType) {
    ObjectType[ObjectType["Image"] = 0] = "Image";
    ObjectType[ObjectType["MovieClip"] = 1] = "MovieClip";
    ObjectType[ObjectType["Sound"] = 2] = "Sound";
    ObjectType[ObjectType["Graph"] = 3] = "Graph";
    ObjectType[ObjectType["Loader"] = 4] = "Loader";
    ObjectType[ObjectType["Group"] = 5] = "Group";
    ObjectType[ObjectType["Text"] = 6] = "Text";
    ObjectType[ObjectType["RichText"] = 7] = "RichText";
    ObjectType[ObjectType["InputText"] = 8] = "InputText";
    ObjectType[ObjectType["Component"] = 9] = "Component";
    ObjectType[ObjectType["List"] = 10] = "List";
    ObjectType[ObjectType["Label"] = 11] = "Label";
    ObjectType[ObjectType["Button"] = 12] = "Button";
    ObjectType[ObjectType["ComboBox"] = 13] = "ComboBox";
    ObjectType[ObjectType["ProgressBar"] = 14] = "ProgressBar";
    ObjectType[ObjectType["Slider"] = 15] = "Slider";
    ObjectType[ObjectType["ScrollBar"] = 16] = "ScrollBar";
    ObjectType[ObjectType["Tree"] = 17] = "Tree";
    ObjectType[ObjectType["Loader3D"] = 18] = "Loader3D";
})(ObjectType || (exports.ObjectType = ObjectType = {}));
/**
 * FGUI Loader Fill Types.
 */
var LoaderFillType;
(function (LoaderFillType) {
    LoaderFillType[LoaderFillType["none"] = 0] = "none";
    LoaderFillType[LoaderFillType["scale"] = 1] = "scale";
    LoaderFillType[LoaderFillType["scaleMatchHeight"] = 2] = "scaleMatchHeight";
    LoaderFillType[LoaderFillType["scaleMatchWidth"] = 3] = "scaleMatchWidth";
    LoaderFillType[LoaderFillType["scaleFree"] = 4] = "scaleFree";
    LoaderFillType[LoaderFillType["scaleNoBorder"] = 5] = "scaleNoBorder";
})(LoaderFillType || (exports.LoaderFillType = LoaderFillType = {}));
/**
 * FGUI Align Types.
 */
var AlignType;
(function (AlignType) {
    AlignType["left"] = "left";
    AlignType["center"] = "center";
    AlignType["right"] = "right";
})(AlignType || (exports.AlignType = AlignType = {}));
var VertAlignType;
(function (VertAlignType) {
    VertAlignType["top"] = "top";
    VertAlignType["middle"] = "middle";
    VertAlignType["bottom"] = "bottom";
})(VertAlignType || (exports.VertAlignType = VertAlignType = {}));
/**
 * FGUI Relation Types.
 */
var RelationType;
(function (RelationType) {
    RelationType["Left_Left"] = "left-left";
    RelationType["Left_Center"] = "left-center";
    RelationType["Left_Right"] = "left-right";
    RelationType["Center_Center"] = "center-center";
    RelationType["Right_Left"] = "right-left";
    RelationType["Right_Center"] = "right-center";
    RelationType["Right_Right"] = "right-right";
    RelationType["Top_Top"] = "top-top";
    RelationType["Top_Middle"] = "top-middle";
    RelationType["Top_Bottom"] = "top-bottom";
    RelationType["Middle_Middle"] = "middle-middle";
    RelationType["Bottom_Top"] = "bottom-top";
    RelationType["Bottom_Middle"] = "bottom-middle";
    RelationType["Bottom_Bottom"] = "bottom-bottom";
    RelationType["Width_Width"] = "width-width";
    RelationType["Height_Height"] = "height-height";
})(RelationType || (exports.RelationType = RelationType = {}));
