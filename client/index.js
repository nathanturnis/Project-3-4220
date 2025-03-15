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
            const imgElement = document.createElement('img');
            imgElement.src = photo.link; // Set the signed URL
            imgElement.alt = photo.photo_name; // Set the photo name as alt text

            const photoDiv = document.createElement('div');
            photoDiv.appendChild(imgElement);

            galleryElement.appendChild(photoDiv);
        });
    } catch (error) {
        console.error('Error fetching photos:', error);
    }
}

// Call the function to fetch photos when the page loads
window.onload = fetchPhotos;