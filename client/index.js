// Function to fetch photos for the logged-in user
async function fetchPhotos(query = '') {
    try {
        const userId = localStorage.getItem('user_id'); // Get user_id from localStorage

        if (!userId) {
            window.location.href = '/login.html'; // Redirect to login page
            return;
        }

        // Construct the URL with user_id
        const url = query
            ? `/photos/search?query=${query}&user_id=${userId}`
            : `/photos?user_id=${userId}`;

        const response = await fetch(url);
        const photos = await response.json();

        console.log(photos);
        const galleryElement = document.getElementById('gallery');
        galleryElement.innerHTML = '';  // Clear the gallery

        // Display each photo in the gallery
        photos.forEach(photo => {
            const imgElement = document.createElement('img');
            imgElement.src = photo.link; // Set the signed URL
            imgElement.alt = photo.photo_name; // Set the photo name as alt text
            imgElement.classList.add('img-fluid', 'w-100'); // Use Bootstrap classes for responsive images

            const downloadBtn = document.createElement('a');

            // Create the div that will hold both the image and the photo name
            const photoDiv = document.createElement('div');
            photoDiv.classList.add('col');

            // Create the photo name element
            const photoName = document.createElement('p');
            photoName.classList.add('text-center', 'mt-2');
            photoName.textContent = photo.photo_name;

            // Create the download link
            const downloadLink = document.createElement('a');
            // downloadLink.href = photo.link;
            downloadLink.download = photo.photo_name;
            downloadLink.classList.add('btn', 'btn-primary', 'd-block', 'mt-2', 'mx-auto');
            downloadLink.textContent = 'Download';
            
            downloadLink.onclick = async (e) => {
                console.log("nals")
                e.preventDefault();
                try {
                    // Extract stored filename from URL
                    const fullUrl = photo.link;
                    const storedFileName = fullUrl.split('/').pop().split('?')[0];
                    
                    // Get user-friendly name from your photo object
                    const photoName = photo.photo_name;
                    
                    const downloadUrl = `/download-file?filename=${
                        encodeURIComponent(storedFileName)
                    }&photoName=${
                        encodeURIComponent(photoName)
                    }`;
                    
                    const tempLink = document.createElement('a');
                    tempLink.href = downloadUrl;
                    tempLink.click();
                } catch (error) {
                    console.error('Download failed:', error);
                }
            
            };

            // Append elements
            photoDiv.appendChild(imgElement);
            photoDiv.appendChild(photoName);
            photoDiv.appendChild(downloadLink);

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

    fetchPhotos(query || '');
};
