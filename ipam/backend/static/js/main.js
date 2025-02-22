document.addEventListener('DOMContentLoaded', function() {
    // Add event listeners for all action buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', handleEdit);
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', handleDelete);
    });

    document.querySelectorAll('.add-btn').forEach(btn => {
        btn.addEventListener('click', handleAdd);
    });

    document.getElementById('saveItem').addEventListener('click', handleSave);
});

async function handleEdit(e) {
    const id = e.target.dataset.id;
    const type = e.target.dataset.type;
    
    try {
        const response = await fetch(`/api/${type}/${id}`);
        const data = await response.json();
        showModal(data, type, 'edit');
    } catch (error) {
        console.error('Error:', error);
        alert('Error loading item');
    }
}

async function handleDelete(e) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    const id = e.target.dataset.id;
    const type = e.target.dataset.type;
    
    try {
        const response = await fetch(`/api/${type}/${id}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            location.reload();
        } else {
            alert('Error deleting item');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error deleting item');
    }
}

function handleAdd(e) {
    const type = e.target.dataset.type;
    showModal({}, type, 'add');
}

function showModal(data, type, mode) {
    const modal = new bootstrap.Modal(document.getElementById('itemModal'));
    const form = document.getElementById('itemForm');
    
    // Clear existing form
    form.innerHTML = '';
    
    // Add hidden fields for type and mode
    form.dataset.type = type;
    form.dataset.mode = mode;
    if (mode === 'edit') {
        form.dataset.id = data.id;
    }
    
    // Create form fields based on data
    for (const [key, value] of Object.entries(data)) {
        if (key === 'id') continue;
        
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = key.replace('_', ' ').toUpperCase();
        
        const input = document.createElement('input');
        input.className = 'form-control';
        input.name = key;
        input.value = value || '';
        
        formGroup.appendChild(label);
        formGroup.appendChild(input);
        form.appendChild(formGroup);
    }
    
    modal.show();
}

async function handleSave() {
    const form = document.getElementById('itemForm');
    const type = form.dataset.type;
    const mode = form.dataset.mode;
    const id = form.dataset.id;
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const url = mode === 'edit' ? `/api/${type}/${id}` : `/api/${type}`;
        const method = mode === 'edit' ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            location.reload();
        } else {
            alert('Error saving item');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error saving item');
    }
}
