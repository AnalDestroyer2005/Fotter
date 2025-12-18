let portfolioData = [
  {
      id: 1,
      title: "Корпоративный сайт для IT-компании",
      description: "Разработал современный корпоративный сайт для IT-компании с акцентом на минимализм и функциональность. Проект включал в себя: дизайн всех страниц, адаптивную верстку, интеграцию с CMS, оптимизацию скорости загрузки и SEO-оптимизацию. Клиент остался очень доволен результатом.",
      date: "Декабрь 2024",
      duration: "3 недели",
      views: "1,234 просмотра",
      tags: ["Веб-дизайн", "UI/UX", "HTML/CSS", "JavaScript", "Figma"],
      images: 3
  },
  {
      id: 2,
      title: "Приложение для доставки",
      description: "Создал интуитивное мобильное приложение для сервиса доставки еды. Разработал пользовательский интерфейс с упором на простоту и скорость оформления заказа. Включает систему отслеживания курьера в реальном времени, историю заказов и программу лояльности.",
      date: "Ноябрь 2024",
      duration: "4 недели",
      views: "892 просмотра",
      tags: ["Мобильные приложения", "React Native", "UI/UX", "Figma"],
      images: 3
  },
  {
      id: 3,
      title: "Редизайн интернет-магазина",
      description: "Полный редизайн интернет-магазина одежды с целью повышения конверсии. Упростил процесс оформления заказа, улучшил навигацию по каталогу, добавил персональные рекомендации. После запуска конверсия выросла на 35%.",
      date: "Октябрь 2024",
      duration: "5 недель",
      views: "2,156 просмотров",
      tags: ["E-commerce", "UI/UX", "Веб-дизайн", "Figma"],
      images: 3
  },
  {
      id: 4,
      title: "Логотип для стартапа",
      description: "Разработал минималистичную айдентику для финтех стартапа. Логотип отражает надежность и инновационность компании. Создал полный фирменный стиль включая визитки, презентации и социальные сети.",
      date: "Октябрь 2024",
      duration: "2 недели",
      views: "678 просмотров",
      tags: ["Брендинг", "Логотип", "Фирменный стиль", "Illustrator"],
      images: 3
  },
  {
      id: 5,
      title: "Лендинг платформы",
      description: "Спроектировал продающий лендинг для образовательной платформы онлайн-курсов. Сделал акцент на преимуществах обучения, добавил отзывы студентов и демо-уроки. Лендинг показал высокую конверсию с первых дней запуска.",
      date: "Сентябрь 2024",
      duration: "2 недели",
      views: "1,445 просмотров",
      tags: ["Landing Page", "Веб-дизайн", "Conversion", "Figma"],
      images: 3
  },
  {
      id: 6,
      title: "UI/UX Банковского приложения",
      description: "Разработал безопасный и интуитивный интерфейс для мобильного банковского приложения. Особое внимание уделил простоте операций и защите данных. Провел UX-исследование и тестирование с реальными пользователями.",
      date: "Август 2024",
      duration: "6 недель",
      views: "3,021 просмотр",
      tags: ["Fintech", "UI/UX", "Mobile", "Security", "Figma"],
      images: 3
  }
];

let currentProject = 0;
let currentSlide = 0;
let editMode = false;
let editingProjectId = null;
let servicesEditing = false;
let skillsEditing = false;

// Tab switching functionality
const tabItems = document.querySelectorAll('.tab-item');
const tabContents = document.querySelectorAll('.tab-content');

tabItems.forEach(tab => {
  tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');
      
      tabItems.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById(`${targetTab}-content`).classList.add('active');
  });
});

// Filter chips functionality
const filterChips = document.querySelectorAll('.filter-chip');
filterChips.forEach(chip => {
  chip.addEventListener('click', () => {
      const parent = chip.parentElement;
      parent.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
  });
});

// Render portfolio grid
function renderPortfolio() {
  const grid = document.querySelector('.portfolio-grid');
  if (!grid) return;
  
  grid.innerHTML = portfolioData.map((project, index) => `
      <div class="portfolio-item" onclick="openModal(${index})">
          <div class="portfolio-actions">
              <button class="action-btn" onclick="event.stopPropagation(); openModalForEdit(${index})">
                  <i class="ri-pencil-line"></i>
              </button>
              <button class="action-btn delete" onclick="event.stopPropagation(); confirmDelete(${index})">
                  <i class="ri-delete-bin-line"></i>
              </button>
          </div>
          <div class="portfolio-thumb">
              <i class="ri-image-line"></i>
          </div>
          <div class="portfolio-info">
              <div class="portfolio-title">${project.title}</div>
              <div class="portfolio-desc">${project.description.substring(0, 80)}...</div>
          </div>
      </div>
  `).join('');
}

// Open modal for new project or editing
function openModalForEdit(projectIndex = null) {
  editingProjectId = projectIndex !== null ? portfolioData[projectIndex].id : null;
  editMode = true;

  const titleEl = document.getElementById('eTitle');
  const descEl = document.getElementById('eDesc');
  const dateEl = document.getElementById('eDate');
  const durationEl = document.getElementById('eDuration');
  const tagsBox = document.getElementById('tagsBox');

  if (!titleEl || !descEl || !dateEl || !durationEl || !tagsBox) return;

  if (projectIndex !== null) {
      const project = portfolioData[projectIndex];
      titleEl.value = project.title;
      descEl.value = project.description;
      dateEl.value = project.date;
      durationEl.value = project.duration;

      const tagInput = document.getElementById('tagInput');
      tagsBox.innerHTML = '';
      project.tags.forEach(tag => addTagChip(tag));
      if (tagInput) tagsBox.appendChild(tagInput);
  } else {
      document.getElementById('editForm')?.reset();
      tagsBox.innerHTML = '<input type="text" class="tag-input-field" id="tagInput" placeholder="Введите тег...">';
  }

  document.getElementById('portfolioModal')?.classList.add('active');
  document.getElementById('modalView').style.display = 'none';
  document.getElementById('modalEdit').style.display = 'block';
  document.body.style.overflow = 'hidden';

  setupTagInput();
}

// Setup tag input functionality
function setupTagInput() {
  const tagInput = document.getElementById('tagInput');
  if (!tagInput) return;
  
  tagInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          const value = tagInput.value.trim();
          if (value) {
              addTagChip(value);
              tagInput.value = '';
          }
      }
  };
}

// Add tag chip
function addTagChip(tagText) {
  const tagsContainer = document.getElementById('tagsBox');
  const tagInput = document.getElementById('tagInput');
  if (!tagsContainer || !tagInput) return;
  
  const chip = document.createElement('div');
  chip.className = 'tag-input-chip';
  chip.innerHTML = `
      <span>${tagText}</span>
      <span class="tag-remove" onclick="this.parentElement.remove()">×</span>
  `;
  
  tagsContainer.insertBefore(chip, tagInput);
}

// Get tags from form
function getTagsFromForm() {
  const chips = document.querySelectorAll('.tag-input-chip span:first-child');
  return Array.from(chips).map(chip => chip.textContent);
}

// Save project
function saveProject(event) {
  event.preventDefault();
  
  const title = document.getElementById('eTitle').value;
  const description = document.getElementById('eDesc').value;
  const date = document.getElementById('eDate').value;
  const duration = document.getElementById('eDuration').value;
  const tags = getTagsFromForm();
  
  if (editingProjectId) {
      // Update existing project
      const index = portfolioData.findIndex(p => p.id === editingProjectId);
      if (index !== -1) {
          portfolioData[index] = {
              ...portfolioData[index],
              title,
              description,
              date,
              duration,
              tags
          };
      }
  } else {
      // Add new project
      const newId = Math.max(...portfolioData.map(p => p.id), 0) + 1;
      portfolioData.push({
          id: newId,
          title,
          description,
          date,
          duration,
          views: '0 просмотров',
          tags,
          images: 3
      });
  }
  
  renderPortfolio();
  cancelEditing();
}

// Start editing current project in modal
function startEditingProject() {
  openModalForEdit(currentProject);
}

// Cancel editing
function cancelEditing() {
  document.getElementById('modalEdit').style.display = 'none';
  document.getElementById('modalView').style.display = 'block';
  editMode = false;
  editingProjectId = null;
  
  if (portfolioData.length > 0) {
      updateModalContent();
  } else {
      closeModal();
  }
}

// Confirm delete
function confirmDelete(projectIndex) {
  if (confirm('Вы уверены, что хотите удалить этот проект?')) {
      portfolioData.splice(projectIndex, 1);
      renderPortfolio();
  }
}

// Delete current project from modal
function deleteProject() {
  if (confirm('Вы уверены, что хотите удалить этот проект?')) {
      portfolioData.splice(currentProject, 1);
      renderPortfolio();
      
      if (portfolioData.length > 0) {
          if (currentProject >= portfolioData.length) {
              currentProject = portfolioData.length - 1;
          }
          updateModalContent();
      } else {
          closeModal();
      }
  }
}

// Portfolio modal functions
function openModal(projectIndex) {
  currentProject = projectIndex;
  currentSlide = 0;
  updateModalContent();
  const modal = document.getElementById('portfolioModal');
  if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
  }
}

function closeModal() {
  const modal = document.getElementById('portfolioModal');
  if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = 'auto';
  }
}

function updateModalContent() {
  const project = portfolioData[currentProject];
  
  document.getElementById('mTitle').textContent = project.title;
  document.getElementById('mDesc').textContent = project.description;
  document.getElementById('mDate').textContent = project.date;
  document.getElementById('mDuration').textContent = project.duration;
  document.getElementById('mViews').textContent = project.views;
  
  const tagsContainer = document.getElementById('mTags');
  if (tagsContainer) {
      tagsContainer.innerHTML = project.tags.map(tag => 
          `<span class="modal-tag">${tag}</span>`
      ).join('');
  }

  // Update navigation buttons
  const prevBtn = document.querySelector('.project-nav-btn.prev');
  const nextBtn = document.querySelector('.project-nav-btn.next');
  if (prevBtn) prevBtn.disabled = currentProject === 0;
  if (nextBtn) nextBtn.disabled = currentProject === portfolioData.length - 1;
  
  // Reset slide
  goToSlide(0);
}

function changeSlide(direction) {
  const slides = document.querySelectorAll('.gallery-slide');
  const indicators = document.querySelectorAll('.indicator');
  
  currentSlide += direction;
  
  if (currentSlide < 0) currentSlide = slides.length - 1;
  if (currentSlide >= slides.length) currentSlide = 0;
  
  slides.forEach((slide, index) => {
      slide.classList.toggle('active', index === currentSlide);
  });
  
  indicators.forEach((indicator, index) => {
      indicator.classList.toggle('active', index === currentSlide);
  });
}

function goToSlide(index) {
  currentSlide = index;
  const slides = document.querySelectorAll('.gallery-slide');
  const indicators = document.querySelectorAll('.indicator');
  
  slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === index);
  });
  
  indicators.forEach((indicator, i) => {
      indicator.classList.toggle('active', i === index);
  });
}

function changeProject(direction) {
  const newIndex = currentProject + direction;
  
  if (newIndex >= 0 && newIndex < portfolioData.length) {
      currentProject = newIndex;
      updateModalContent();
  }
}


// Services edit (about section)
function setupServicesEditor() {
  const grid = document.getElementById('servicesGrid');
  const btn = grid?.closest('.section-block')?.querySelector('.edit-btn');
  if (!grid || !btn) return;

  btn.addEventListener('click', () => {
      servicesEditing = !servicesEditing;
      grid.classList.toggle('is-editing', servicesEditing);
      const text = servicesEditing ? '?????????' : '?????????????';
      btn.innerHTML = `<i class="ri-${servicesEditing ? 'check' : 'pencil'}-line"></i>${text}`;

      grid.querySelectorAll('.service-name, .service-description').forEach(el => {
          el.contentEditable = servicesEditing;
          el.classList.toggle('editable', servicesEditing);
      });
  });
}

// Skills edit
function createSkillTag(text) {
  const tag = document.createElement('span');
  tag.className = 'tag';
  tag.textContent = text;
  return tag;
}

function setupSkillsEditor() {
  const box = document.getElementById('skillsTags');
  const btn = box?.closest('.section-block')?.querySelector('.edit-btn');
  if (!box || !btn) return;

  const inputId = 'skillInput';

  btn.addEventListener('click', () => {
      skillsEditing = !skillsEditing;
      box.classList.toggle('is-editing', skillsEditing);
      const text = skillsEditing ? '??????' : '?????????????';
      btn.innerHTML = `<i class="ri-${skillsEditing ? 'check' : 'pencil'}-line"></i>${text}`;

      box.querySelectorAll('.tag').forEach(tag => {
          tag.contentEditable = skillsEditing;
          tag.classList.toggle('editable', skillsEditing);
          tag.onclick = skillsEditing ? () => tag.remove() : null;
      });

      if (skillsEditing) {
          if (!box.querySelector('#' + inputId)) {
              const input = document.createElement('input');
              input.id = inputId;
              input.type = 'text';
              input.className = 'tag-input-field';
              input.placeholder = '????? ????? ? Enter';
              input.onkeydown = (e) => {
                  if (e.key === 'Enter') {
                      e.preventDefault();
                      const value = input.value.trim();
                      if (value) {
                          const tag = createSkillTag(value);
                          box.insertBefore(tag, input);
                          input.value = '';
                      }
                  }
              };
              box.appendChild(input);
          }
      } else {
          box.querySelector('#' + inputId)?.remove();
          box.querySelectorAll('.tag').forEach(tag => { tag.onclick = null; tag.contentEditable = false; });
      }
  });
}

// Init listeners
document.addEventListener('DOMContentLoaded', () => {
  renderPortfolio();

  const addWorkBtn = document.getElementById('btnAddWork');
  if (addWorkBtn) addWorkBtn.addEventListener('click', () => openModalForEdit());

  setupServicesEditor();
  setupSkillsEditor();

  document.getElementById('editForm')?.addEventListener('submit', saveProject);
  document.getElementById('eCancel')?.addEventListener('click', cancelEditing);

  document.getElementById('mEdit')?.addEventListener('click', startEditingProject);
  document.getElementById('mDelete')?.addEventListener('click', deleteProject);
  document.querySelector('[data-close]')?.addEventListener('click', closeModal);

  document.querySelectorAll('[data-slide]').forEach(btn => {
      btn.addEventListener('click', () => changeSlide(Number(btn.dataset.slide) || 0));
  });
  document.querySelectorAll('[data-goto]').forEach(indicator => {
      indicator.addEventListener('click', () => goToSlide(Number(indicator.dataset.goto) || 0));
  });
  document.querySelectorAll('[data-project]').forEach(btn => {
      btn.addEventListener('click', () => changeProject(Number(btn.dataset.project) || 0));
  });

  document.getElementById('portfolioModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'portfolioModal') {
          closeModal();
      }
  });
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'ArrowLeft') changeSlide(-1);
  if (e.key === 'ArrowRight') changeSlide(1);
});
