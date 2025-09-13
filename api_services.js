// api_services.js

export const searchCities = async (query) => {
    const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
    try {
        const response = await fetch(`${NOMINATIM_URL}?q=${query}&format=json&addressdetails=1`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.map(item => ({
            name: item.address.city || item.address.town || item.address.village || item.display_name,
            country: item.address.country,
            lat: item.lat,
            lon: item.lon
        }));
    } catch (error) {
        console.error('Error fetching cities:', error);
        return [];
    }
};

export const getTimezone = async (lat, lon) => {
    const OPENMETEO_URL = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m&timezone=auto`;
    
    try {
        const response = await fetch(OPENMETEO_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.timezone;
    } catch (error) {
        console.error('Error fetching timezone:', error);
        return null;
    }
};