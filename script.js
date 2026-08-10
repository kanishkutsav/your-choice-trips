const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('.site-nav');

if (menuToggle && siteNav) {
  menuToggle.addEventListener('click', () => {
    siteNav.classList.toggle('open');
  });
}

const packageCards = document.querySelectorAll('.package-card');

packageCards.forEach((card) => {
  const trigger = card.querySelector('.package-card-trigger');

  if (!trigger) return;

  trigger.addEventListener('click', () => {
    const isOpen = card.classList.contains('is-active');

    packageCards.forEach((item) => {
      item.classList.remove('is-active');
      const itemTrigger = item.querySelector('.package-card-trigger');
      if (itemTrigger) {
        itemTrigger.setAttribute('aria-expanded', 'false');
      }
    });

    if (!isOpen) {
      card.classList.add('is-active');
      trigger.setAttribute('aria-expanded', 'true');
    }
  });
});

const endpoint = form.id === 'trip-form'
  ? '/.netlify/functions/send-enquiry'
  : '/api/contact';
const contactForm = document.getElementById('contact-form');

const submitForm = async (event) => {
  event.preventDefault();

  const form = event.target;
  const button = form.querySelector('button');
  const feedback = form.querySelector('.form-message');
  const originalText = button?.textContent || 'Submit';

  if (button) {
    button.textContent = 'Sending...';
    button.disabled = true;
  }

  try {
    const endpoint = form.id === 'trip-form'
      ? '/.netlify/functions/send-enquiry'
      : '/api/contact';

    const payload = Object.fromEntries(
      new FormData(form).entries()
    );

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong.');
    }

    if (feedback) {
      feedback.textContent =
        data.message ||
        'Thank you! We will reach out shortly.';
    }

    // Only clear the form after successful submission
    form.reset();

  } catch (error) {
    console.error('Form submission error:', error);

    if (feedback) {
      feedback.textContent =
        'Something went wrong. Please try again.';
    }

  } finally {
    if (button) {
      button.textContent = originalText;
      button.disabled = false;
    }
  }
};

tripForm?.addEventListener('submit', submitForm);
contactForm?.addEventListener('submit', submitForm);


