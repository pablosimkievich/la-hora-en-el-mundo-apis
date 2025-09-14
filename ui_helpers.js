// ui_helpers.js
import { getTimezone } from "./api_services.js";
import { showAlert } from "./main.js";

const clocksContainer = document.getElementById('clocks-container');
const resultsContainer = document.getElementById('results-container');
const MAX_CITIES = 8;

export const updateClockDisplay = (type) => {
    localStorage.setItem('clockType', type);
    const analogBtn = document.getElementById('analog-btn');
    const digitalBtn = document.getElementById('digital-btn');
    analogBtn.classList.remove('active');
    digitalBtn.classList.remove('active');
    if (type === 'digital') digitalBtn.classList.add('active');
    else analogBtn.classList.add('active');

    document.querySelectorAll('.clock-display').forEach(display => {
        display.classList.toggle('digital-view', type === 'digital');
        display.classList.toggle('analog-view', type === 'analog');
    });
};

export const addClock = async (cityInfo, displayedCities, isInitialLoad = false) => {
    if (clocksContainer.children.length >= MAX_CITIES && !isInitialLoad) {
        showAlert('¡Máximo de 8 relojes alcanzado!');
        resultsContainer.classList.add('hidden');
        return false;
    }
    if (!cityInfo.lat || !cityInfo.lon) return false;

    const timeZone = await getTimezone(cityInfo.lat, cityInfo.lon);
    if (!timeZone) return false;

    const normalizedName = cityInfo.name.toLowerCase().trim();
    const existingCities = Array.from(clocksContainer.querySelectorAll('.city-name'))
        .map(el => el.textContent.toLowerCase().trim());
    if (!isInitialLoad && existingCities.includes(normalizedName)) {
        showAlert('¡Esta ciudad ya está agregada!');
        resultsContainer.classList.add('hidden');
        return false;
    }

    const card = document.createElement('div');
    card.classList.add('clock-card', 'rounded-xl', 'p-6', 'flex', 'flex-col', 'items-center');
    card.setAttribute('draggable', 'true');
    card.dataset.lat = cityInfo.lat;
    card.dataset.lon = cityInfo.lon;

    card.innerHTML = `
        <div class="flex justify-between items-start w-full mb-4">
            <div class="text-left">
                <h3 class="city-name">${cityInfo.name}</h3>
                <p class="text-sm">${cityInfo.country}</p>
            </div>
            <button class="remove-btn  hover:text-red-dark">
                &times;
            </button>
        </div>
        <div class="clock-display flex items-center justify-center w-full">
            <div class="digital-wrapper bg-primary-lightest p-3 rounded-xl shadow">
                <div class="clock-digital"></div>
            </div>
            <div class="clock-analog">
                <div class="hand hour"></div>
                <div class="hand minute"></div>
                <div class="hand second"></div>
            </div>
        </div>
    `;
    clocksContainer.appendChild(card);
    displayedCities.add(timeZone);

    const clockDisplay = card.querySelector('.clock-display');
    clockDisplay.classList.toggle('digital-view', localStorage.getItem('clockType') === 'digital');
    clockDisplay.classList.toggle('analog-view', localStorage.getItem('clockType') === 'analog');

    const updateClock = () => {
        const date = new Date();
        const formatter = new Intl.DateTimeFormat('es-AR', {
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone
        });
        const [h, m, s] = formatter.format(date).split(':').map(Number);
        card.querySelector('.clock-digital').textContent = formatter.format(date);
        const hourHand = card.querySelector('.hand.hour');
        const minuteHand = card.querySelector('.hand.minute');
        const secondHand = card.querySelector('.hand.second');
        if (hourHand) hourHand.style.transform = `rotate(${(h % 12) * 30 + m * 0.5}deg)`;
        if (minuteHand) minuteHand.style.transform = `rotate(${m * 6 + s * 0.1}deg)`;
        if (secondHand) secondHand.style.transform = `rotate(${s * 6}deg)`;
    };
    updateClock();
    setInterval(updateClock, 1000);

    if (!isInitialLoad) {
        const storedCities = JSON.parse(localStorage.getItem('storedCities') || '[]');
        if (!storedCities.some(c => c.name.toLowerCase().trim() === normalizedName)) {
            storedCities.push(cityInfo);
            localStorage.setItem('storedCities', JSON.stringify(storedCities));
        }
    }

    card.querySelector('.remove-btn').addEventListener('click', () => {
        card.remove();
        displayedCities.delete(timeZone);

        // Eliminar solo esta ciudad de storedCities
        const storedCities = JSON.parse(localStorage.getItem('storedCities') || '[]')
            .filter(c => c.name.toLowerCase() !== normalizedName);
        localStorage.setItem('storedCities', JSON.stringify(storedCities));
    });


    return true;
};

export const renderSearchResults = (results) => {
    resultsContainer.innerHTML = '';
    if (!results.length) return resultsContainer.classList.add('hidden');
    resultsContainer.classList.remove('hidden');
    results.forEach(city => {
        const item = document.createElement('div');
        item.classList.add('result-item', 'p-2', 'cursor-pointer');
        item.dataset.name = city.name;
        item.dataset.country = city.country;
        item.dataset.lat = city.lat;
        item.dataset.lon = city.lon;
        item.innerHTML = `<span>${city.name}</span><span class="text-xs text-gray-500 ml-2">(${city.country})</span>`;
        resultsContainer.appendChild(item);
    });
};
