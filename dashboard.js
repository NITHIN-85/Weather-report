// dashboard.js
const API_KEY = '46f5ecacb5a94ae7869130139250201'; // Replace with your WeatherAPI.com key
let chart = null;

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    // Check if geolocation is available on load
    if (navigator.geolocation) {
        getCurrentLocation();
    } else {
        loadDefaultCity();
    }
});

// Add this to your setupEventListeners function in dashboard.js
function setupEventListeners() {
    document.getElementById('search-btn').addEventListener('click', searchLocation);
    document.getElementById('current-location-btn').addEventListener('click', getCurrentLocation);
    document.getElementById('historical-btn').addEventListener('click', showDateRangeDialog);
    document.getElementById('home-btn').addEventListener('click', resetDashboard);
    document.querySelectorAll('.metric-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchMetric(e));
    });

    // Add enter key support for search
    document.getElementById('location-search').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchLocation();
        }
    });
}

function showDateRangeDialog() {
    const cityName = document.getElementById('city-name').textContent.split(',')[0];
    if (!cityName) {
        alert('Please select a city first');
        return;
    }

    const dialog = document.getElementById('date-range-dialog');
    dialog.style.display = 'flex';

    // Set max date to today for both inputs
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('start-date').max = today;
    document.getElementById('end-date').max = today;

    // Event listeners for dialog buttons
    document.getElementById('fetch-history').onclick = () => {
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;

        if (startDate && endDate) {
            if (new Date(startDate) > new Date(endDate)) {
                alert('Start date must be before end date');
                return;
            }
            fetchHistoricalDataRange(startDate, endDate);
            dialog.style.display = 'none';
        } else {
            alert('Please select both start and end dates');
        }
    };

    document.getElementById('cancel-dialog').onclick = () => {
        dialog.style.display = 'none';
    };
}

function loadDefaultCity() {
    fetchWeatherData('London'); // Default city
}

function getCurrentLocation() {
    if (navigator.geolocation) {
        // Show loading state
        document.getElementById('current-location-btn').textContent = 'Getting location...';
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    await fetchWeatherData(`${latitude},${longitude}`);
                } catch (error) {
                    console.error('Error fetching weather data:', error);
                    alert('Error fetching weather data. Please try again.');
                }
                // Reset button text
                document.getElementById('current-location-btn').textContent = '📍 Current Location';
            },
            (error) => {
                console.error('Geolocation error:', error);
                alert('Unable to get your location. Please check your browser settings.');
                loadDefaultCity();
                // Reset button text
                document.getElementById('current-location-btn').textContent = '📍 Current Location';
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    } else {
        alert('Geolocation is not supported by your browser');
        loadDefaultCity();
    }
}

async function searchLocation() {
    const city = document.getElementById('location-search').value.trim();
    if (city) {
        try {
            await fetchWeatherData(city);
        } catch (error) {
            console.error('Error:', error);
            alert('Error fetching weather data. Please try again.');
        }
    }
}

async function fetchWeatherData(location) {
    try {
        const response = await fetch(
            `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${location}&days=7&aqi=yes`
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message);
        }
        
        updateDashboard(data);
        return data;
    } catch (error) {
        console.error('Error:', error);
        alert(`Error fetching weather data: ${error.message}`);
        throw error;
    }
}

async function fetchHistoricalDataRange(startDate, endDate) {
    const cityName = document.getElementById('city-name').textContent.split(',')[0];
    if (!cityName) return;

    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const dateArray = [];
        
        // Generate array of dates between start and end
        for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
            dateArray.push(new Date(dt).toISOString().split('T')[0]);
        }

        const container = document.getElementById('historical-data');
        container.innerHTML = '<div class="loading">Loading historical data...</div>';

        // Fetch data for each date
        const historicalData = [];
        for (const date of dateArray) {
            const response = await fetch(
                `https://api.weatherapi.com/v1/history.json?key=${API_KEY}&q=${cityName}&dt=${date}`
            );
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            historicalData.push(data);
        }

        updateHistoricalDataDisplay(historicalData);
    } catch (error) {
        console.error('Error fetching historical data:', error);
        alert(`Error fetching historical data: ${error.message}`);
    }
}

function updateHistoricalDataDisplay(dataArray) {
    const container = document.getElementById('historical-data');
    const template = document.getElementById('historical-card-template');
    container.innerHTML = '<div class="historical-data-grid"></div>';
    const grid = container.querySelector('.historical-data-grid');

    dataArray.forEach(data => {
        const dayData = data.forecast.forecastday[0];
        const card = template.content.cloneNode(true);
        
        // Format date
        const date = new Date(dayData.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Update card content
        card.querySelector('.date').textContent = date;
        card.querySelector('.weather-icon').src = `https:${dayData.day.condition.icon}`;
        card.querySelector('.temperature').textContent = `${Math.round(dayData.day.avgtemp_c)}°C`;
        card.querySelector('.condition').textContent = dayData.day.condition.text;
        card.querySelector('.humidity').textContent = `${dayData.day.avghumidity}%`;
        card.querySelector('.wind').textContent = `${dayData.day.maxwind_kph} km/h`;
        card.querySelector('.uv').textContent = `uv: ${dayData.day.uv}`;


        grid.appendChild(card);
    });
}

// Rest of the existing functions remain the same
function updateDashboard(data) {
    // ... (keep existing implementation)
     // Update current weather
    document.getElementById('current-temp').textContent = `${Math.round(data.current.temp_c)}°C`;
    document.getElementById('weather-desc').textContent = data.current.condition.text;
    document.getElementById('weather-icon').src = `https:${data.current.condition.icon}`;
    document.getElementById('city-name').textContent = `${data.location.name}, ${data.location.country}`;
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

     // Update weather details
    document.getElementById('humidity').textContent = `${data.current.humidity}%`;
    document.getElementById('wind-speed').textContent = `${data.current.wind_kph} km/h`;
    document.getElementById('uv-index').textContent = data.current.uv;
    document.getElementById('feels-like').textContent = `${Math.round(data.current.feelslike_c)}°C`;
    document.getElementById('pressure').textContent = `${data.current.pressure_mb} hPa`;

    updateForecast(data.forecast.forecastday);
    updateHourlyChart(data.forecast.forecastday[0].hour);
}

function updateForecast(forecast) {
    // ... (keep existing implementation)
    const container = document.getElementById('forecast-container');
    container.innerHTML = '';

    forecast.forEach(day => {
        const date = new Date(day.date).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });

        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <h3>${date}</h3>
            <img src="https:${day.day.condition.icon}" alt="weather">
            <p class="temp">${Math.round(day.day.avgtemp_c)}°C</p>
            <p class="condition">${day.day.condition.text}</p>
        `;
        container.appendChild(card);
    });
}

function updateHourlyChart(hourlyData) {

    // ... (keep existing implementation)
    const ctx = document.getElementById('hourly-chart').getContext('2d');
    const activeMetric = document.querySelector('.metric-btn.active').dataset.metric;
    
    const metrics = {
        temp: {
            label: 'Temperature (°C)',
            data: hourlyData.map(hour => hour.temp_c),
            color: '#00b4db'
        },
        humidity: {
            label: 'Humidity (%)',
            data: hourlyData.map(hour => hour.humidity),
            color: '#4CAF50'
        },
        wind: {
            label: 'Wind Speed (km/h)',
            data: hourlyData.map(hour => hour.wind_kph),
            color: '#FFA726'
        }
    };

    if (chart) {
        chart.destroy();
    }

    const selectedMetric = metrics[activeMetric];

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hourlyData.map(hour => hour.time.split(' ')[1]),
            datasets: [{
                label: selectedMetric.label,
                data: selectedMetric.data,
                borderColor: selectedMetric.color,
                backgroundColor: `${selectedMetric.color}33`,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: 'white' }
                }
            },
            scales: {
                y: {
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    ticks: { color: 'white' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

function switchMetric(event) {
    // ... (keep existing implementation)
    document.querySelectorAll('.metric-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    const city = document.getElementById('city-name').textContent.split(',')[0];
    fetchWeatherData(city);
}
// Add this new function to handle resetting the dashboard
function resetDashboard() {
    // Clear search input
    document.getElementById('location-search').value = '';
    
    // Reset weather information
    document.getElementById('current-temp').textContent = '--°C';
    document.getElementById('weather-desc').textContent = 'Weather description';
    document.getElementById('weather-icon').src = '';
    document.getElementById('city-name').textContent = 'City, Country';
    
    // Reset weather details
    document.getElementById('humidity').textContent = '--%';
    document.getElementById('wind-speed').textContent = '-- km/h';
    document.getElementById('uv-index').textContent = '--';
    document.getElementById('feels-like').textContent = '--°C';
    document.getElementById('pressure').textContent = '-- hPa';
    
    // Clear forecast container
    document.getElementById('forecast-container').innerHTML = '';
    
    // Clear historical data if any
    document.getElementById('historical-data').innerHTML = '';
    
    // Reset chart
    if (chart) {
        chart.destroy();
        chart = null;
    }
    
    // Load default city (optional)
    
}