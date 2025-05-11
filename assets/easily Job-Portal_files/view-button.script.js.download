function openModal(button) {
    var modal = button.closest(".card").nextElementSibling;
    modal.classList.add("open-profile-popup");
    var overlay = document.getElementsByClassName("overlay");
    overlay[0].classList.remove("hidden");
}

function closeModal(button) {
    var modal = button.closest(".profile-popup");
    modal.classList.remove("open-profile-popup");
    var overlay = document.getElementsByClassName("overlay");
    overlay[0].classList.add("hidden");
}

function openApplyModal(button) {
    var modal = button.nextElementSibling;
    modal.classList.add("open-profile-popup");
    var overlay = document.getElementsByClassName("overlay");
    overlay[0].classList.remove("hidden");
}

function closeApplyModal(button) {
    var modal = button.closest(".profile-popup");
    modal.classList.remove("open-profile-popup");
    var overlay = document.getElementsByClassName("overlay");
    overlay[0].classList.add("hidden");
}

window.onclick = function (event) {
    var modal = button.closest(".card").nextElementSibling;
    if (event.target == modal) {
        modal.classList.remove("open-profile-popup");
        var overlay = document.getElementsByClassName("overlay");
        overlay[0].classList.add("hidden");
    }
};

function confirmDelete() {
    const confirmed = confirm("Are you sure you want to delete this job?");
    if (confirmed) {
        return true;
    } else {
        return false;
    }
}

function confirmApply() {
    const confirmed = confirm("Are you sure you want to Apply to this job?");
    if (confirmed) {
        return true;
    } else {
        return false;
    }
}

function confirmSendEmail() {
    const confirmed = confirm("Are you sure you want to Send Email to the Recruiter of this job?");
    if (confirmed) {
        return true;
    } else {
        return false;
    }
}

function showPdf(base64Data) {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length).fill().map((_, i) => byteCharacters.charCodeAt(i));
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "application/pdf" });

    // Create an object URL from the Blob
    const blobURL = URL.createObjectURL(blob);

    // Open the PDF in a new tab
    window.open(blobURL, "_blank");
}

document.getElementById("three-bars").addEventListener("click", function () {
    const navbarMenu = document.getElementById("menu");
    navbarMenu.classList.toggle("active");
});

// Add event listener to hide menu when mouse leaves
document.getElementById("menu").addEventListener("mouseleave", function () {
    this.classList.remove("active");
});

const dropdowns = document.querySelectorAll(".navbar-ul > li");

dropdowns.forEach((dropdown) => {
    // Toggle dropdown on click
    dropdown.addEventListener("click", function () {
        const currentDropdown = this.querySelector(".dropdown");
        if (currentDropdown) {
            currentDropdown.classList.toggle("dropdown-active");
        }
    });

    // Hide dropdown when mouse leaves the dropdown area
    dropdown.addEventListener("mouseleave", function () {
        const currentDropdown = this.querySelector(".dropdown");
        if (currentDropdown) {
            currentDropdown.classList.remove("dropdown-active");
        }
    });
});
