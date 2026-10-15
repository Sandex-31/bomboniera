/** Programs in the course language of LFT-5.2, the handed-in text.txt first. */
export const EXAMPLES = [
  { name: "La consegna (text.txt)", program: "read(x);\nif(|| < x 10 && > x 20 ! > x 30) print(+(x,100))\nelse print(x) end", input: "25" },
  { name: "Somma di due letture", program: "read(x);\nread(y);\nprint(+(x,y))", input: "2\n3" },
  { name: "Assegnamento e prodotto", program: "assign [6 to a];\nprint(*(a,7))", input: "" },
  { name: "Con un errore di sintassi", program: "read(x;\nprint(x)", input: "" },
];
