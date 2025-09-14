// main.js
import { debounce } from './utils.js';
import { searchCities, getTimezone } from './api_services.js';
import { renderSearchResults, addClock, updateClockDisplay } from './ui_helpers.js';

// Constantes y estado
const MAX_CITIES = 8;
let displayedCities = new Set();
const analogBtn = document.getElementById('analog-btn');
const digitalBtn = document.getElementById('digital-btn');
const cityInput = document.getElementById('city-input');
const resultsContainer = document.getElementById('results-container');
const clocksContainer = document.getElementById('clocks-container');
const root = document.documentElement;
const themeToggleBtn = document.getElementById('theme-toggle-btn');
let clockIntervals = {};

// Paletas de colores disponibles
const palettes = {
    blue: ['--blue-darkest', '--blue-darker', '--blue-dark', '--blue-medium', '--blue-light', '--blue-lighter', '--blue-lightest'],
    red: ['--red-darkest', '--red-darker', '--red-dark', '--red-medium', '--red-light', '--red-lighter', '--red-lightest'],
    green: ['--green-darkest', '--green-darker', '--green-dark', '--green-medium', '--green-light', '--green-lighter', '--green-lightest']
};

const setColorPalette = (paletteName) => {
    const palette = palettes[paletteName];
    const primaryMapping = {
        '--primary-darkest': palette[0],
        '--primary-darker': palette[1],
        '--primary-dark': palette[2],
        '--primary-color': palette[3],
        '--primary-light': palette[4],
        '--primary-lighter': palette[5],
        '--primary-lightest': palette[6]
    };

    for (const [primaryVar, colorVar] of Object.entries(primaryMapping)) {
        root.style.setProperty(primaryVar, `var(${colorVar})`);
    }
    document.querySelectorAll('.dot').forEach(dot => dot.classList.remove('active'));
    document.getElementById(`${paletteName}-dot`).classList.add('active');
    localStorage.setItem('colorPalette', paletteName);
};

const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
};

const limitAlert = document.getElementById('limit-alert');

export const showAlert = (message) => {
    limitAlert.textContent = message;
    limitAlert.classList.remove('hidden');
    limitAlert.style.opacity = '1';
    limitAlert.style.transform = 'scale(1) translate(-50%, 0)';
    
    setTimeout(() => {
        limitAlert.style.opacity = '0';
        limitAlert.style.transform = 'scale(0.95) translate(-50%, 0)';
        setTimeout(() => {
            limitAlert.classList.add('hidden');
        }, 300);
    }, 3000);
};

// Función para probar las alertas - puedes llamarla desde la consola del navegador
window.testAlert = () => {
    showAlert('¡Esto es una alerta de prueba!');
};

const handleSearchInput = async (e) => {
    const query = e.target.value;
    if (query.length > 2) {
        const cities = await searchCities(query);
        renderSearchResults(cities);
    } else {
        resultsContainer.classList.add('hidden');
    }
};

// Mostrar resultados al volver a hacer focus si hay una búsqueda
cityInput.addEventListener('focus', async (e) => {
    const query = e.target.value;
    if (query.length > 2) {
        const cities = await searchCities(query);
        renderSearchResults(cities);
    }
});

// Añadir manejador para clicks fuera del área de búsqueda
document.addEventListener('click', (e) => {
    const isClickInside = cityInput.contains(e.target) || resultsContainer.contains(e.target);
    if (!isClickInside) {
        resultsContainer.classList.add('hidden');
    }
});

const handleInitialLoad = async () => {
    // Limpiar el estado inicial
    displayedCities.clear();
    clocksContainer.innerHTML = '';
    
    const savedClockType = localStorage.getItem('clockType');
    const savedPalette = localStorage.getItem('colorPalette') || 'blue';
    const savedTheme = localStorage.getItem('theme') || 'light';
    const storedCities = JSON.parse(localStorage.getItem('storedCities') || '[]');

    // Eliminar duplicados del almacenamiento
    const uniqueCities = Array.from(new Set(storedCities.map(JSON.stringify))).map(JSON.parse);
    localStorage.setItem('storedCities', JSON.stringify(uniqueCities));

    setColorPalette(savedPalette);
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
    }

    if (savedClockType) {
        updateClockDisplay(savedClockType);
    } else {
        updateClockDisplay('digital');
    }

    // Recrear los relojes guardados
    for (const cityInfo of uniqueCities) {
        await addClock(cityInfo, displayedCities, true);
    }
};

document.addEventListener('DOMContentLoaded', handleInitialLoad);

cityInput.addEventListener('input', debounce(handleSearchInput, 300));

resultsContainer.addEventListener('click', async (e) => {
    const item = e.target.closest('.result-item');
    if (item && clocksContainer.children.length < MAX_CITIES) {
        const cityInfo = {
            name: item.dataset.name,
            country: item.dataset.country,
            lat: item.dataset.lat,
            lon: item.dataset.lon
        };
        const added = await addClock(cityInfo, displayedCities);
        if (added) {
            cityInput.value = '';
            resultsContainer.classList.add('hidden');
        }
    } else if (item) {
        showAlert('¡Máximo de 8 relojes alcanzado!');
        resultsContainer.classList.add('hidden');
    }
});


analogBtn.addEventListener('click', () => updateClockDisplay('analog'));
digitalBtn.addEventListener('click', () => updateClockDisplay('digital'));

document.getElementById('blue-dot').addEventListener('click', () => setColorPalette('blue'));
document.getElementById('red-dot').addEventListener('click', () => setColorPalette('red'));
document.getElementById('green-dot').addEventListener('click', () => setColorPalette('green'));

themeToggleBtn.addEventListener('click', toggleTheme);


let draggedItem = null;

clocksContainer.addEventListener('dragstart', (e) => {
    draggedItem = e.target.closest('.clock-card');
    if (draggedItem) {
        e.dataTransfer.effectAllowed = 'move';
        draggedItem.classList.add('dragging');
    }
});

clocksContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    const target = e.target.closest('.clock-card');
    if (target && target !== draggedItem) {
        const rect = target.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const isBefore = y < rect.height / 2;
        if (isBefore) {
            clocksContainer.insertBefore(draggedItem, target);
        } else {
            clocksContainer.insertBefore(draggedItem, target.nextSibling);
        }
    }
});

clocksContainer.addEventListener('dragend', () => {
    if (draggedItem) {
        draggedItem.classList.remove('dragging');
        const newOrder = Array.from(clocksContainer.children).map(card => card.dataset.timezone);
        localStorage.setItem('displayedCities', JSON.stringify(newOrder));
        draggedItem = null;
    }
});