document.getElementById('PhotoForm').addEventListener('submit', async function (e) {
    e.preventDefault();  // Prevent the default form submission

    const userId = localStorage.getItem('user_id'); // Get user_id from localStorage

    if (!userId) {
        window.location.href = '/login.html'; // Redirect to login page
        return;
    }

    const photoName = document.getElementById('PhotoNameInput').value;
    const photoFile = document.getElementById('PhotoFileInput').files[0];

    // Check if both fields have values
    if (!photoName || !photoFile) {
        alert("Please provide both a photo name and a photo file.");
        return;
    }

    const formData = new FormData();
    formData.append('user_id', userId); // Attach user ID
    formData.append('photo_name', photoName);
    formData.append('photo', photoFile); // 'photo' is the field name used in the server

    try {
        const response = await fetch('/photos', {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();
        if (response.ok) {
            alert("Photo uploaded successfully!");
            console.log(result); // Optionally, log the response from the server
            document.getElementById('PhotoForm').reset(); // Clear the form
        } else {
            alert("Error uploading photo.");
            console.error(result.error || result); // Handle server error
        }
    } catch (error) {
        alert("Network error.");
        console.error(error); // Log the error to console
    }
});
