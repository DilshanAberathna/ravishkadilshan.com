function appendMedia(container, attachments = []) {
  if (!attachments.length) return;
  const gallery = document.createElement('div');
  gallery.className = 'entry-media';
  for (const file of attachments) {
    const url = '/media/' + encodeURIComponent(file.id);
    let element;
    if (/\.(jpg|jpeg|png|webp|gif)$/.test(file.id)) {
      element = document.createElement('img');
      element.src = url;
      element.alt = file.name;
      element.loading = 'lazy';
    } else if (/\.(mp4|webm)$/.test(file.id)) {
      element = document.createElement('video');
      element.src = url;
      element.controls = true;
      element.preload = 'metadata';
      element.setAttribute('aria-label', file.name);
    } else {
      element = document.createElement('a');
      element.href = url;
      element.download = file.name;
      element.textContent = 'Download ' + file.name;
    }
    gallery.append(element);
  }
  container.append(gallery);
}

function setText(selector, text) {
  document.querySelector(selector).textContent = text;
}

function entryCard(entry) {
  const card = document.createElement('article');
  card.className = 'platform-card published-entry';
  const title = document.createElement('h3');
  title.textContent = entry.title;
  card.append(title);
  if (entry.body) {
    const body = document.createElement('p');
    body.textContent = entry.body;
    card.append(body);
  }
  if (/^https?:\/\//i.test(entry.url)) {
    const link = document.createElement('a');
    link.href = entry.url;
    link.textContent = 'Open link ↗';
    card.append(link);
  }
  appendMedia(card, entry.media);
  return card;
}

async function showPublishedContent() {
  const response = await fetch('api/content', {cache: 'no-store'});
  if (!response.ok) return;
  const entries = await response.json();
  const group = section => entries.filter(entry => entry.section === section);
  const navigation = document.querySelector('.site-header nav');
  const contactLink = navigation.querySelector('a[href="#contact"]');
  const contactSection = document.querySelector('#contact');
  for (const entry of group('sections')) {
    const section = document.createElement('section');
    section.className = 'section custom-section';
    section.id = 'custom-' + entry.id;
    const heading = document.createElement('h2');
    heading.textContent = entry.title;
    heading.id = section.id + '-title';
    section.setAttribute('aria-labelledby', heading.id);
    section.append(heading);
    const content = entryCard(entry);
    content.querySelector('h3').remove();
    section.append(content);
    contactSection.before(section);

    const navLink = document.createElement('a');
    navLink.href = '#' + section.id;
    navLink.textContent = entry.title;
    contactLink.before(navLink);
    if (location.hash === navLink.hash) section.scrollIntoView();
  }
  const profile = group('profile')[0];
  if (profile) {
    const attachments = profile.media ?? [];
    const portrait = attachments.find(file => /\.(jpg|jpeg|png|webp|gif)$/.test(file.id));
    const resume = attachments.find(file => /\.(pdf|docx?|odt|txt)$/i.test(file.id));
    if (portrait) {
      const image = document.querySelector('#hero-portrait');
      image.addEventListener('load', () => {
        if (!image.getAttribute('src').startsWith('/media/')) return;
        image.alt = 'Portrait of ' + profile.title;
        image.hidden = false;
        setText('#portrait-caption', 'PORTRAIT');
      }, {once: true});
      image.addEventListener('error', () => {
        image.src = 'assets/portrait-placeholder.svg';
        image.alt = 'Placeholder portrait';
        image.hidden = true;
        setText('#portrait-caption', 'PORTRAIT PLACEHOLDER');
      }, {once: true});
      image.src = '/media/' + encodeURIComponent(portrait.id);
    }
    appendMedia(document.querySelector('.about-grid > div'), attachments.filter(file => file !== portrait && file !== resume));
    if (resume) {
      const resumeSlot = document.querySelector('#hero-resume');
      if (resumeSlot) {
        const link = document.createElement('a');
        link.className = 'text-link';
        link.href = '/media/' + encodeURIComponent(resume.id);
        link.download = resume.name;
        link.textContent = 'Résumé ↗';
        resumeSlot.replaceWith(link);
      }
    }
    if (/^https?:\/\//i.test(profile.github)) {
      for (const id of ['#footer-github', '#github-section-link']) {
        const githubSlot = document.querySelector(id);
        if (!githubSlot) continue;
        const link = document.createElement('a');
        link.href = profile.github;
        link.textContent = 'GitHub ↗';
        githubSlot.replaceWith(link);
      }
    }
    setText('#name', profile.title);
    setText('.student-role', profile.role || 'Cybersecurity Student');
    setText('.hero-description', profile.body);
    setText('.about-intro', profile.body);
    document.title = profile.title + ' — Cybersecurity Portfolio';
    if (/^https?:\/\//i.test(profile.url)) {
      const link = document.querySelector('.hero .text-link');
      link.href = profile.url;
      link.textContent = 'Profile ↗';
    }
  }
  const contact = group('contact')[0];
  if (contact) {
    appendMedia(document.querySelector('#contact'), contact.media);
    setText('#contact-title', contact.title);
    setText('#contact > p:not(.eyebrow)', contact.body);
    if (/^https?:\/\//i.test(contact.url)) {
      const link = document.querySelector('#contact .primary');
      link.href = contact.url;
      link.textContent = 'Get in touch ↗';
    }
  }
  const lists = [
    ['projects', '#work .project-grid', '#work .filters'],
    ['blogs', '#writing', '#writing .writing-entry'],
    ['achievements', '#practice', '#practice .project-grid'],
    ['career', '#career', '#career .portfolio-rows'],
    ['background', '#background', '#background .portfolio-rows'],
    ['toolkit', '#toolkit', '#toolkit .portfolio-rows'],
    ['github', '#github', '#github .portfolio-rows'],
  ];
  for (const [section, target, placeholder] of lists) {
    const items = group(section);
    if (!items.length) continue;
    if (placeholder) document.querySelector(placeholder)?.remove();
    const container = document.querySelector(target);
    if (section === 'projects') container.replaceChildren(...items.map(entryCard));
    else {
      const grid = document.createElement('div');
      grid.className = 'project-grid';
      grid.append(...items.map(entryCard));
      container.append(grid);
    }
  }
  for (const card of document.querySelectorAll('#writeups .platform-card')) {
    const platform = card.querySelector('h3').textContent;
    const items = group('writeups').filter(item => item.platform === platform);
    if (!items.length) continue;
    card.querySelector('.eyebrow').remove();
    card.append(...items.map(entryCard));
  }
}

showPublishedContent().catch(() => {});
