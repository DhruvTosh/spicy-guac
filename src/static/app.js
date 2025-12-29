document.addEventListener('DOMContentLoaded', () => {
  const activitiesListEl = document.getElementById('activities-list');
  const activitySelect = document.getElementById('activity');
  const signupForm = document.getElementById('signup-form');
  const messageEl = document.getElementById('message');

  let activities = {};

  function showMessage(text, type = 'info') {
    messageEl.className = `message ${type}`;
    messageEl.textContent = text;
    messageEl.classList.remove('hidden');
    setTimeout(() => messageEl.classList.add('hidden'), 4000);
  }

  function createActivityCard(name, data) {
    const card = document.createElement('div');
    card.className = 'activity-card';
    card.dataset.activity = name;

    const title = document.createElement('h4');
    title.textContent = name;
    card.appendChild(title);

    const desc = document.createElement('p');
    desc.textContent = data.description || '';
    card.appendChild(desc);

    const schedule = document.createElement('p');
    schedule.innerHTML = `<strong>Schedule:</strong> ${data.schedule || 'TBA'}`;
    card.appendChild(schedule);

    const capacity = document.createElement('p');
    capacity.innerHTML = `<strong>Max Participants:</strong> ${data.max_participants ?? '—'}`;
    card.appendChild(capacity);

    // Participants section
    const participantsWrap = document.createElement('div');
    participantsWrap.className = 'participants';

    const participantsTitle = document.createElement('h5');
    participantsTitle.textContent = 'Participants';
    participantsWrap.appendChild(participantsTitle);

    const ul = document.createElement('ul');
    ul.className = 'participants-list';
    if (Array.isArray(data.participants) && data.participants.length) {
      data.participants.forEach(email => {
        const li = document.createElement('li');
        li.className = 'participant-item';
        
        // Create span for email
        const emailSpan = document.createElement('span');
        emailSpan.className = 'participant-email';
        emailSpan.textContent = email;
        li.appendChild(emailSpan);
        
        // Create delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '\u2715';
        deleteBtn.type = 'button';
        deleteBtn.title = 'Remove participant';
        deleteBtn.addEventListener('click', () => removeParticipant(name, email, li));
        
        li.appendChild(deleteBtn);
        ul.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.className = 'participant-item';
      li.textContent = 'No participants yet';
      ul.appendChild(li);
    }
    participantsWrap.appendChild(ul);
    card.appendChild(participantsWrap);

    return card;
  }

  function renderActivities() {
    activitiesListEl.innerHTML = '';
    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';
    Object.keys(activities).forEach(name => {
      const card = createActivityCard(name, activities[name]);
      activitiesListEl.appendChild(card);

      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      activitySelect.appendChild(opt);
    });
  }

  function removeParticipant(activityName, email, listItem) {
    fetch(`/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`, {
      method: 'POST'
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to unregister');
        return res.json();
      })
      .then(data => {
        listItem.remove();
        // Remove from local state
        const idx = activities[activityName].participants.indexOf(email);
        if (idx > -1) activities[activityName].participants.splice(idx, 1);
        
        // If no participants left, show "No participants yet"
        const card = document.querySelector(`.activity-card[data-activity="${CSS.escape(activityName)}"]`);
        if (card) {
          const ul = card.querySelector('.participants-list');
          if (ul && ul.children.length === 0) {
            const li = document.createElement('li');
            li.className = 'participant-item';
            li.textContent = 'No participants yet';
            ul.appendChild(li);
          }
        }
        showMessage(data.message || 'Participant removed', 'success');
      })
      .catch(err => {
        showMessage(err.message || 'Failed to unregister participant', 'error');
        console.error(err);
      });
  }

  function updateParticipantsUI(activityName, email) {
    const card = document.querySelector(`.activity-card[data-activity="${CSS.escape(activityName)}"]`);
    if (!card) return;
    const ul = card.querySelector('.participants-list');
    if (!ul) return;
    // If "No participants yet" is present, clear it
    if (ul.children.length === 1 && ul.children[0].textContent === 'No participants yet') {
      ul.innerHTML = '';
    }
    const li = document.createElement('li');
    li.className = 'participant-item';
    
    // Create span for email
    const emailSpan = document.createElement('span');
    emailSpan.className = 'participant-email';
    emailSpan.textContent = email;
    li.appendChild(emailSpan);
    
    // Create delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '\u2715';
    deleteBtn.type = 'button';
    deleteBtn.title = 'Remove participant';
    deleteBtn.addEventListener('click', () => removeParticipant(activityName, email, li));
    
    li.appendChild(deleteBtn);
    ul.appendChild(li);
  }

  async function loadActivities() {
    activitiesListEl.innerHTML = '<p>Loading activities...</p>';
    try {
      const res = await fetch('/activities');
      if (!res.ok) throw new Error('Failed to load activities');
      activities = await res.json();
      renderActivities();
    } catch (err) {
      activitiesListEl.innerHTML = `<p class="error">Unable to load activities.</p>`;
      console.error(err);
    }
  }

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const activity = activitySelect.value;
    if (!email || !activity) {
      showMessage('Please provide an email and select an activity.', 'error');
      return;
    }
    try {
      const res = await fetch(`/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`, {
        method: 'POST'
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error((err && err.detail) || 'Signup failed');
      }
      const data = await res.json().catch(() => null);
      showMessage(data && data.message ? data.message : 'Signed up!', 'success');

      // Update local state and UI
      if (!Array.isArray(activities[activity].participants)) activities[activity].participants = [];
      activities[activity].participants.push(email);
      updateParticipantsUI(activity, email);
      signupForm.reset();
    } catch (err) {
      showMessage(err.message || 'Signup failed', 'error');
      console.error(err);
    }
  });

  loadActivities();
});
