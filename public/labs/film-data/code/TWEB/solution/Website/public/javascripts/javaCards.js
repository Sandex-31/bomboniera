/**
 * Utilities for building static film cards in the catalog.
 */
const pagina = document.getElementById("filmCatalog");

/**
 * Creates and appends a card for a film.
 * @param {Array} param0 array containing [img, title]
 */
function creaCarta([img,title]) {
    const contenitore = document.createElement("div");
    contenitore.classList.add("containercard");

    const card = document.createElement("div");
    card.classList.add("card");

    const immagine = document.createElement('img');
    immagine.src = img;
    immagine.classList.add('card-img-top');
    immagine.id = 'sliderImage';
    immagine.alt = title;

    const titolo = document.createElement("h6");
    titolo.classList.add("card-title");
    titolo.id = 'crop';
    titolo.textContent = title;


    card.append(immagine,titolo);
    contenitore.appendChild(card);
    pagina.appendChild(contenitore);
}



