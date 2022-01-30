var d3Data = [3,2,5];
var nodes = d3.select('div')
    .selectAll('p')
    .data(d3Data)
    .enter()
        .append('p')
        .text(function (dta){return 'hello ' +  dta;});

function addMore(){
    d3Data.push(8);
    d3Data.push(12);
    d3Data.push(15);

    d3.select('div')
    .selectAll('p')
    .data(d3Data)
    .enter()
        .append('p')
        .text(function (dta){return 'hello ' +  dta;});

    // console.table("created fields: ", nodes);
}