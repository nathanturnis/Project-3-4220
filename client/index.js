// Function to fetch photos based on the query (if any)
async function fetchPhotos(query = '') {
    try {
        // If query exists, use it; otherwise, fetch all photos
        const url = query ? `/photos/search?query=${query}` : '/photos';
        const response = await fetch(url);
        const photos = await response.json();

        console.log(photos);
        const galleryElement = document.getElementById('gallery');
        galleryElement.innerHTML = '';  // Clear the gallery

        // Display each photo in the gallery
        photos.forEach(photo => {
            // Create the image element
            const imgElement = document.createElement('img');
            imgElement.src = photo.link; // Set the signed URL
            imgElement.alt = photo.photo_name; // Set the photo name as alt text
            imgElement.classList.add('img-fluid', 'w-100'); // Use Bootstrap classes for responsive images

            // Create the div that will hold both the image and the photo name
            const photoDiv = document.createElement('div');
            photoDiv.classList.add('col'); // Use Bootstrap grid classes

            // Create the photo name element and append it under the image
            const photoName = document.createElement('p');
            photoName.classList.add('text-center', 'mt-2'); // Center the text and add top margin
            photoName.textContent = photo.photo_name; // Set the text to the photo's name

            // Create the download link
            const downloadLink = document.createElement('a');
            downloadLink.href = photo.link; // Link to the signed URL
            downloadLink.download = photo.photo_name; // The file name to be used during download
            downloadLink.classList.add('btn', 'btn-primary', 'd-block', 'mt-2', 'mx-auto'); // Add Bootstrap classes for styling
            downloadLink.textContent = 'Download'; // Set text for the button

            // Append the image, photo name, and download link to the photoDiv
            photoDiv.appendChild(imgElement);
            photoDiv.appendChild(photoName);
            photoDiv.appendChild(downloadLink);

            // Append the photoDiv to the gallery container
            galleryElement.appendChild(photoDiv);
        });

    } catch (error) {
        console.error('Error fetching photos:', error);
    }
}

// Handle form submission to search photos by name
document.getElementById('SearchPhotosForm').addEventListener('submit', function (e) {
    e.preventDefault();  // Prevent the form from submitting normally

    const query = document.getElementById('SearchPhotosInput').value.trim(); // Get the search query

    if (query) {
        // Update the URL to include the search query
        window.history.pushState({}, '', `?query=${query}`);

        // Fetch photos based on the search query
        fetchPhotos(query);
    }
});

// Check if there is a query in the URL and fetch the appropriate photos
window.onload = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('query');  // Get the 'query' parameter from the URL

    // Call fetchPhotos with the query (if present)
    fetchPhotos(query || '');
};
