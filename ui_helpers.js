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

    document.querySelectorAll('.clock-display').forEach(display => {
        if (type === 'digital') {
            display.classList.add('digital-view');
            display.classList.remove('analog-view');
            digitalBtn.classList.add('active');
            analogBtn.classList.remove('active');
        } else {
            display.classList.add('analog-view');
            display.classList.remove('digital-view');
            analogBtn.classList.add('active');
            digitalBtn.classList.remove('active');
        }
    });
};

export const addClock = async (cityInfo, displayedCities, isInitialLoad = false) => {
    // Check max cities first
    if (clocksContainer.children.length >= MAX_CITIES) {
        showAlert('¡Máximo de 8 relojes alcanzado!');
        return false;
    }

    const timeZone = await getTimezone(cityInfo.lat, cityInfo.lon);
    if (!timeZone) {
        console.error('Could not get timezone for the city.');
        return false;
    }
    
    // Evita duplicados solo cuando no es carga inicial
    if (!isInitialLoad) {
        const normalizedCityName = cityInfo.name.toLowerCase().trim();
        const existingCities = Array.from(clocksContainer.querySelectorAll('.city-name'))
            .map(el => el.textContent.toLowerCase().trim());
        
        if (existingCities.includes(normalizedCityName)) {
            showAlert('¡Esta ciudad ya está agregada!');
            return false;
        }
    }

    // Create clock card
    const card = document.createElement('div');
    card.classList.add('clock-card', 'rounded-xl', 'p-6', 'flex', 'flex-col', 'items-center', 'cursor-move');
    card.setAttribute('draggable', 'true');
    card.dataset.timezone = timeZone;

    const cityName = cityInfo.name.split(',')[0];
    const countryName = cityInfo.country;

    card.innerHTML = `
        <div class="flex justify-between items-start w-full mb-4">
            <div class="text-left">
                <h3 class="city-name">${cityName}</h3>
                <p class="text-sm">${countryName}</p>
            </div>
            <button class="remove-btn text-gray-500 hover:text-red-dark" data-city="${timeZone}">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
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
    const clockType = localStorage.getItem('clockType');
    if (clockType === 'digital') {
        clockDisplay.classList.add('digital-view');
    } else {
        clockDisplay.classList.add('analog-view');
    }

    const timeUpdater = () => {
        const date = new Date();
        const formatter = new Intl.DateTimeFormat('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: timeZone
        });
        const formattedTime = formatter.format(date);
        const [hours, minutes, seconds] = formattedTime.split(':').map(Number);
        updateDigitalClock(card.querySelector('.clock-digital'), formattedTime);
        updateAnalogClock(card.querySelector('.clock-analog'), hours, minutes, seconds);
    };

    timeUpdater();
    const clockIntervals = JSON.parse(localStorage.getItem('clockIntervals') || '{}');
    clockIntervals[timeZone] = setInterval(timeUpdater, 1000);
    localStorage.setItem('clockIntervals', JSON.stringify(clockIntervals));

    // Guardar la información de la ciudad también para recrear el card
    const storedCities = JSON.parse(localStorage.getItem('storedCities') || '[]');
    storedCities.push(cityInfo);
    localStorage.setItem('storedCities', JSON.stringify(storedCities));


    card.querySelector('.remove-btn').addEventListener('click', (e) => {
        const cityToRemove = e.currentTarget.dataset.city;
        const cardToRemove = document.querySelector(`[data-timezone="${cityToRemove}"]`);
        
        if (cardToRemove) {
            // Detener el intervalo antes de eliminar
            const storedIntervals = JSON.parse(localStorage.getItem('clockIntervals') || '{}');
            clearInterval(storedIntervals[cityToRemove]);
            delete storedIntervals[cityToRemove];
            localStorage.setItem('clockIntervals', JSON.stringify(storedIntervals));

            // Eliminar la ciudad del array guardado en localStorage
            const storedCities = JSON.parse(localStorage.getItem('storedCities') || '[]')
                .filter(city => city.name !== cityName);
            localStorage.setItem('storedCities', JSON.stringify(storedCities));

            // Eliminar la ciudad del Set y actualizar localStorage
            displayedCities.delete(cityToRemove);
            localStorage.setItem('displayedCities', JSON.stringify(Array.from(displayedCities)));

            // Eliminar el card del DOM
            cardToRemove.remove();
        }
    });

    return true;
};

export const renderSearchResults = (results) => {
    resultsContainer.innerHTML = '';
    if (results.length > 0) {
        resultsContainer.classList.remove('hidden');
        results.forEach(city => {
            const item = document.createElement('div');
            item.classList.add('result-item', 'p-2', 'cursor-pointer');
            item.innerHTML = `
                <span>${city.name}</span>
                <span class="text-xs text-gray-500 dark:text-gray-400 ml-2">(${city.country})</span>
            `;
            item.dataset.lat = city.lat;
            item.dataset.lon = city.lon;
            item.dataset.name = city.name;
            item.dataset.country = city.country;
            resultsContainer.appendChild(item);
        });
    } else {
        resultsContainer.classList.add('hidden');
    }
};

const updateDigitalClock = (element, timeString) => {
    element.textContent = timeString;
};

const updateAnalogClock = (element, hours, minutes, seconds) => {
    const secondHand = element.querySelector('.hand.second');
    const minuteHand = element.querySelector('.hand.minute');
    const hourHand = element.querySelector('.hand.hour');
    const displayHours = hours > 12 ? hours - 12 : hours;
    const secondDeg = seconds * 6;
    const minuteDeg = minutes * 6 + seconds * 0.1;
    const hourDeg = (displayHours * 30) + (minutes * 0.5);
    if (secondHand) secondHand.style.transform = `rotate(${secondDeg}deg)`;
    if (minuteHand) minuteHand.style.transform = `rotate(${minuteDeg}deg)`;
    if (hourHand) hourHand.style.transform = `rotate(${hourDeg}deg)`;
};