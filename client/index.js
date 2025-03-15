// Function to fetch all photos from the backend
async function fetchPhotos() {
    try {
        const response = await fetch('http://localhost:3000/photos');
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

// Call the function to fetch photos when the page loads
window.onload = fetchPhotos;