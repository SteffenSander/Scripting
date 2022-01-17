function ToPrimitive(input, preferredType){
  
    switch (preferredType){
      case Number:
        return toNumber(input);
        break;
      case String:
        return toString(input);
        break
      default:
        return toNumber(input);  
    }
    
    function isPrimitive(value){
      return value !== Object(value);
    }
  
    function toString(){
      if (isPrimitive(input.toString())) return input.toString();
      if (isPrimitive(input.valueOf())) return input.valueOf();
      throw new TypeError();
    }
  
    function toNumber(){
      if (isPrimitive(input.valueOf())) return input.valueOf();
      if (isPrimitive(input.toString())) return input.toString();
      throw new TypeError();
    }
}

console.log(`primitive value of type Number: ${ToPrimitive(1, Number)}`);
console.log(isNaN(ToPrimitive(1, Number)));
