const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('.site-nav');

if (menuToggle && siteNav) {
  menuToggle.setAttribute('aria-expanded', 'false');

  menuToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  });

  siteNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      siteNav.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Open menu');
    });
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

const tripForm = document.getElementById('trip-form');
const contactForm = document.getElementById('contact-form');

const submitForm = async (event) => {
  event.preventDefault();

  const form = event.target;
  const button = form.querySelector('button');

  // The trip form's message is outside the <form>,
  // while the contact form's message is inside it.
  const feedback =
    form.querySelector('.form-message') ||
    document.getElementById('form-message');

  const originalText = button?.textContent || 'Submit';

  if (button) {
    button.textContent = 'Sending...';
    button.disabled = true;
  }

  try {
    const payload = Object.fromEntries(
      new FormData(form).entries()
    );

    // Tell the Netlify Function which form was submitted.
    payload.formType =
      form.id === 'trip-form'
        ? 'enquiry'
        : 'contact';

    const response = await fetch(
      '/.netlify/functions/send-email',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || 'Something went wrong.'
      );
    }

    if (feedback) {
      feedback.textContent =
        data.message ||
        'Thank you! We will reach out shortly.';
    }

    // Only reset the form after successful submission.
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
