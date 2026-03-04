// ==========================================
// 1. INITIALISATION EMAILJS
// ==========================================
(function() {
    // Ta clé publique reste la même
    emailjs.init("0KIZsdmC9-6djUAdc");
    console.log("✓ EmailJS initialisé avec le nouveau template");
})();

// ==========================================
// 2. GESTION DU CHARGEMENT (PRELOADER)
// ==========================================
window.addEventListener("load", () => {
    const preloader = document.getElementById("preloader");
    if (preloader) {
        setTimeout(() => {
            preloader.classList.add("hide");
            document.body.style.overflow = "auto";
        }, 1200);
    }
});

// ==========================================
// 3. EFFETS VISUELS (CURSEUR & ANIMATIONS)
// ==========================================
const cursor = document.querySelector(".cursor-dot");
const hoverTargets = document.querySelectorAll(".hover-target");

if (cursor) {
    document.addEventListener("mousemove", (e) => {
        cursor.style.left = e.clientX + "px";
        cursor.style.top = e.clientY + "px";
    });

    hoverTargets.forEach((target) => {
        target.addEventListener("mouseenter", () => cursor.classList.add("hover-link"));
        target.addEventListener("mouseleave", () => cursor.classList.remove("hover-link"));
    });
}

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add("active");
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.15 });

document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

// ==========================================
// 4. ENVOI DU FORMULAIRE (CORRIGÉ)
// ==========================================
const contactForm = document.querySelector(".minimal-form");

if (contactForm) {
    contactForm.addEventListener("submit", function(event) {
        event.preventDefault();

        const btn = contactForm.querySelector("button");
        const originalText = btn.innerText;

        btn.innerText = "ENVOI EN COURS...";
        btn.disabled = true;

        // Utilisation de ton nouvel ID : template_m5iakmb
        emailjs.sendForm('service_5rvma1d', 'template_m5iakmb', this)
            .then(() => {
                alert("✓ Message envoyé avec succès !");
                contactForm.reset();
            })
            .catch((error) => {
                console.error("Erreur détaillée:", error);
                alert("Erreur lors de l'envoi. Vérifie que le reCAPTCHA est bien désactivé dans EmailJS.");
            })
            .finally(() => {
                btn.innerText = originalText;
                btn.disabled = false;
            });
    });
}