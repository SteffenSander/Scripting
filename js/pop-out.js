
// create a simple type
function SimpleType(typeName){
    this.typeName = typeName;
}

SimpleType.prototype.toString = function(){
    return this.typeName;
}