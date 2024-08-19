document.getElementById('bblValue').addEventListener('input', function(event) {
    handleInput(event.target.value.replace(/,/g, ''), 'bbl');
});

document.getElementById('m3Value').addEventListener('input', function(event) {
    handleInput(event.target.value.replace(/,/g, ''), 'm3');
});

document.getElementById('tonValue').addEventListener('input', function(event) {
    handleInput(event.target.value.replace(/,/g, ''), 'ton');
});

document.getElementById('densitySelect').addEventListener('change', function() {
    const density = parseFloat(document.getElementById('densitySelect').value);
    if (!isNaN(density)) {
        document.getElementById('densityValue').value = density.toFixed(3);
        handleInput(null, 'density');
    }
});

document.getElementById('densityValue').addEventListener('input', function() {
    const density = parseFloat(document.getElementById('densityValue').value);
    if (!isNaN(density)) {
        document.getElementById('densitySelect').value = 'custom';
        handleInput(null, 'density');
    }
});

document.getElementById('oilPrice').addEventListener('input', function() {
    const oilPrice = parseFloat(document.getElementById('oilPrice').value);
    const bblValue = parseFloat(document.getElementById('bblValue').value.replace(/,/g, ''));
    if (!isNaN(oilPrice) && !isNaN(bblValue)) {
        const valueUSD = calculateValue(bblValue, oilPrice);
        const goldValue = calculateGold(valueUSD);
        document.getElementById('value').value = formatNumber(valueUSD);
        document.getElementById('goldValue').value = formatNumber(goldValue);
        updateValueContainer(valueUSD);
    }
});

function handleInput(value, source) {
    let bblValue, m3Value, tonValue, density, oilPrice, valueUSD, goldValue;

    switch (source) {
        case 'bbl':
            bblValue = parseFloat(value);
            if (!isNaN(bblValue)) {
                bblValue = Math.round(bblValue);
                m3Value = convertBblToM3(bblValue);
                density = parseFloat(document.getElementById('densityValue').value);
                tonValue = calculateTon(m3Value, density);
                oilPrice = parseFloat(document.getElementById('oilPrice').value);
                valueUSD = calculateValue(bblValue, oilPrice);
                goldValue = calculateGold(valueUSD);
                updateAllFields(bblValue, m3Value, density, tonValue, valueUSD, 'bbl', goldValue);
                updateProgressBar(tonValue);
                updateValueContainer(valueUSD);
            }
            break;
        case 'm3':
            m3Value = parseFloat(value);
            if (!isNaN(m3Value)) {
                const roundedM3Value = parseFloat(m3Value.toFixed(1));
                bblValue = convertM3ToBbl(roundedM3Value);
                density = parseFloat(document.getElementById('densityValue').value);
                tonValue = calculateTon(roundedM3Value, density);
                oilPrice = parseFloat(document.getElementById('oilPrice').value);
                valueUSD = calculateValue(bblValue, oilPrice);
                goldValue = calculateGold(valueUSD);
                updateAllFields(bblValue, roundedM3Value, density, tonValue, valueUSD, 'm3', goldValue);
                updateProgressBar(tonValue);
                updateValueContainer(valueUSD);
            }
            break;
        case 'ton':
            tonValue = parseFloat(value);
            if (!isNaN(tonValue)) {
                density = parseFloat(document.getElementById('densityValue').value);
                m3Value = parseFloat((tonValue / density).toFixed(1));
                bblValue = convertM3ToBbl(m3Value);
                oilPrice = parseFloat(document.getElementById('oilPrice').value);
                valueUSD = calculateValue(bblValue, oilPrice);
                goldValue = calculateGold(valueUSD);
                updateAllFields(bblValue, m3Value, density, tonValue, valueUSD, 'ton', goldValue);
                updateProgressBar(tonValue);
                updateValueContainer(valueUSD);
            }
            break;
        case 'density':
            density = parseFloat(document.getElementById('densityValue').value);
            if (!isNaN(density)) {
                m3Value = parseFloat(document.getElementById('m3Value').value.replace(/,/g, ''));
                tonValue = calculateTon(m3Value, density);
                bblValue = parseFloat(document.getElementById('bblValue').value.replace(/,/g, ''));
                oilPrice = parseFloat(document.getElementById('oilPrice').value);
                valueUSD = calculateValue(bblValue, oilPrice);
                goldValue = calculateGold(valueUSD);
                updateAllFields(bblValue, m3Value, density, tonValue, valueUSD, 'density', goldValue);
                updateProgressBar(tonValue);
                updateValueContainer(valueUSD);
            }
            break;
    }
}

function convertBblToM3(bbl) {
    return (bbl * 0.1589873).toFixed(1);
}

function convertM3ToBbl(m3) {
    return Math.round(m3 / 0.1589873);
}

function calculateTon(m3, density) {
    return (m3 * density).toFixed(1);
}

function calculateValue(bbl, oilPrice) {
    return (bbl * oilPrice / 1000).toFixed(1);
}

function calculateGold(valueUSD) {
    const goldPricePerKg = 77775; // Replace this with current gold price per kg
    return (valueUSD / goldPricePerKg).toFixed(2);
}

function updateAllFields(bbl, m3, density, ton, valueUSD, source, goldValue) {
    if (source !== 'bbl' && bbl !== null) {
        document.getElementById('bblValue').value = formatNumber(bbl);
    }
    if (source !== 'm3' && m3 !== null) {
        document.getElementById('m3Value').value = formatNumber(m3);
    }
    if (source !== 'density' && density !== null) {
        document.getElementById('densityValue').value = density.toFixed(3);
    }
    if (source !== 'ton' && ton !== null) {
        document.getElementById('tonValue').value = formatNumber(ton);
    }
    if (source !== 'value' && valueUSD !== null) {
        document.getElementById('value').value = formatNumber(valueUSD);
    }
    if (source !== 'gold' && goldValue !== null) {
        document.getElementById('goldValue').value = formatNumber(goldValue);
    }
    if (bbl !== null && m3 !== null && ton !== null) {
        updateResult(bbl, m3, ton, valueUSD);
    }
}

function updateResult(bbl, m3, ton, valueUSD) {
    const formattedBbl = formatLargeNumber(bbl);
    const formattedM3 = formatLargeNumber(m3);
    const formattedTon = formatLargeNumber(ton);

    document.getElementById('result').innerText = `${formattedBbl} bbl = ${formattedM3} m³ = ${formattedTon} ton`;
    document.getElementById('top-separator').style.display = 'block';
    document.getElementById('bottom-separator').style.display = 'block';
}

function updateProgressBar(ton) {
    const countryConsumptions = [
        { country: 'USA', consumption: 851.6e6 },
        { country: 'China', consumption: 559.7e6 },
        { country: 'India', consumption: 195.5e6 },
        { country: 'Japan', consumption: 191.3e6 },
        { country: 'Russia', consumption: 168.1e6 },
        { country: 'Saudi Arabia', consumption: 158.4e6 },
        { country: 'Brazil', consumption: 141.1e6 },
        { country: 'South Korea', consumption: 125.7e6 },
        { country: 'Germany', consumption: 110.2e6 },
        { country: 'Canada', consumption: 100.3e6 },
        { country: 'Iran', consumption: 88.9e6 },
        { country: 'Mexico', consumption: 84.3e6 },
        { country: 'France', consumption: 76.1e6 },
        { country: 'Indonesia', consumption: 76.1e6 },
        { country: 'UK', consumption: 71.6e6 },
        { country: 'Singapore', consumption: 69.5e6 },
        { country: 'Italy', consumption: 66.5e6 },
        { country: 'Spain', consumption: 60.5e6 },
        { country: 'Thailand', consumption: 56.6e6 },
        { country: 'Australia', consumption: 46.2e6 },
        { country: 'Taiwan', consumption: 40.0e6 },
        { country: 'UAE', consumption: 40.0e6 },
        { country: 'Egypt', consumption: 39.2e6 },
        { country: 'Netherlands', consumption: 38.7e6 },
        { country: 'Turkey', consumption: 38.8e6 },
        { country: 'Malaysia', consumption: 32.6e6 },
        { country: 'Venezuela', consumption: 32.0e6 },
        { country: 'Argentina', consumption: 31.1e6 },
        { country: 'South Africa', consumption: 31.6e6 },
        { country: 'Belgium', consumption: 30.5e6 },
        { country: 'Pakistan', consumption: 25.2e6 },
        { country: 'Poland', consumption: 25.1e6 },
        { country: 'Kuwait', consumption: 23.6e6 },
        { country: 'Vietnam', consumption: 19.5e6 },
        { country: 'Algeria', consumption: 19.3e6 },
        { country: 'Philippines', consumption: 18.4e6 },
        { country: 'Hong Kong', consumption: 18.3e6 },
        { country: 'Chile', consumption: 16.9e6 },
        { country: 'Colombia', consumption: 16.9e6 },
        { country: 'Sweden', consumption: 14.1e6 },
        { country: 'Kazakhstan', consumption: 12.7e6 },
        { country: 'Austria', consumption: 12.7e6 },
        { country: 'Ecuador', consumption: 11.7e6 },
        { country: 'Portugal', consumption: 11.3e6 },
        { country: 'Peru', consumption: 10.9e6 },
        { country: 'Switzerland', consumption: 10.7e6 },
        { country: 'Romania', consumption: 9.1e6 },
        { country: 'Ukraine', consumption: 8.4e6 },
        { country: 'Finland', consumption: 8.3e6 },
        { country: 'Denmark', consumption: 7.9e6 },
        { country: 'New Zealand', consumption: 7.5e6 },
        { country: 'Belarus', consumption: 7.1e6 },
        { country: 'Hungary', consumption: 7.0e6 },
        { country: 'Ireland', consumption: 6.9e6 },
        { country: 'Turkmenistan', consumption: 6.4e6 },
        { country: 'Bangladesh', consumption: 5.5e6 },
        { country: 'Azerbaijan', consumption: 5.4e6 },
        { country: 'Bulgaria', consumption: 4.2e6 },
        { country: 'Slovakia', consumption: 3.8e6 },
        { country: 'Uzbekistan', consumption: 3.6e6 },
        { country: 'Lithuania', consumption: 2.6e6 },
        { country: 'Trinidad and Tobago', consumption: 1.8e6 }
    ];

    const worldConsumption = 4331.3e6; // Annual World Oil Consumption
    let closestCountry = countryConsumptions.reduce((prev, curr) => {
        return (curr.consumption >= ton && curr.consumption < prev.consumption) ? curr : prev;
    });

    if (ton > 851.6e6) { // If ton value exceeds USA consumption, use world consumption
        closestCountry = { country: 'World', consumption: worldConsumption };
    }

    let maxTon = closestCountry.consumption;
    let progress = (ton / maxTon) * 100;

    let progressBar = document.getElementById('progress');
    let progressText = document.getElementById('progressText');
    let scaleContainer = document.getElementById('scaleContainer');
    let countryInfo = document.getElementById('countryInfo');

    if (progress > 0) {
        scaleContainer.style.display = 'block';
        countryInfo.style.display = 'block';
    } else {
        scaleContainer.style.display = 'none';
        countryInfo.style.display = 'none';
    }

    if (progress > 100) {
        let scaleCount = (ton / maxTon).toFixed(1);
        progressBar.style.width = '100%';
        progressText.innerText = `${scaleCount} Annual World Oil Consumption`;
    } else {
        progressBar.style.width = `${progress}%`;
        progressText.innerText = `${progress.toFixed(1)}% of ${closestCountry.country} Annual Oil Consumption`;
    }
    updateCountryInfo(closestCountry.country);
    adjustFontSize(progressText);
}

function updateValueContainer(valueUSD) {
    const valueContainer = document.getElementById('valueContainer');
    const valueSeparator = document.getElementById('value-separator');
    if (valueUSD > 0) {
        valueContainer.style.display = 'block';
        valueSeparator.style.display = 'block';
        document.getElementById('valueResult').innerText = `$${formatNumber(valueUSD)} thousand`;
    } else {
        valueContainer.style.display = 'none';
        valueSeparator.style.display = 'none';
    }
}

function adjustFontSize(element) {
    let parentWidth = element.parentElement.clientWidth;
    let elementWidth = element.scrollWidth;
    let fontSize = parseInt(window.getComputedStyle(element, null).getPropertyValue('font-size'));

    while (elementWidth > parentWidth && fontSize > 12) {
        fontSize -= 1;
        element.style.fontSize = fontSize + 'px';
        elementWidth = element.scrollWidth;
    }
}

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatLargeNumber(num) {
    if (num >= 1e12) {
        return `${(num / 1e12).toFixed(1)} T`;
    } else if (num >= 1e9) {
        return `${(num / 1e9).toFixed(1)} B`;
    } else if (num >= 1e6) {
        return `${(num / 1e6).toFixed(1)} M`;
    } else if (num >= 1e3) {
        return `${(num / 1e3).toFixed(1)} K`;
    } else {
        return num.toFixed(1);
    }
}

// Set default density to Brent and fetch oil prices
window.onload = function() {
    document.getElementById('densitySelect').value = '0.834';
    document.getElementById('densityValue').value = '0.834';
    fetchOilPrices();
};

async function fetchOilPrices() {
    // Placeholder function to simulate fetching oil prices
    // Replace this with actual API call to fetch oil prices
    const oilPrices = {
        brent: 79.0,
        urals: 70.0,
        wti: 72.0
    };

    document.getElementById('oilPrice').value = oilPrices.brent;
    document.getElementById('densitySelect').addEventListener('change', function() {
        const selectedOil = document.getElementById('densitySelect').value;
        if (selectedOil === '0.834') {
            document.getElementById('oilPrice').value = oilPrices.brent;
        } else if (selectedOil === '0.865') {
            document.getElementById('oilPrice').value = oilPrices.urals;
        } else if (selectedOil === '0.825') {
            document.getElementById('oilPrice').value = oilPrices.wti;
        }
    });
}

// Function to update country information
function updateCountryInfo(country) {
    const countryData = {
        "USA": {
            location: "North America",
            population: "~332 million",
            gdp: "~$70,000",
            import: "Machinery and vehicles",
            export: "Machinery and electronics"
        },
        "China": {
            location: "East Asia",
            population: "~1.4 billion",
            gdp: "~$12,500",
            import: "Integrated circuits and machinery",
            export: "Electronics"
        },
        "India": {
            location: "South Asia",
            population: "~1.4 billion",
            gdp: "~$2,200",
            import: "Crude oil",
            export: "Petroleum products and textiles"
        },
        "Japan": {
            location: "East Asia",
            population: "~125 million",
            gdp: "~$40,000",
            import: "Petroleum and natural gas",
            export: "Vehicles and electronics"
        },
        "Russia": {
            location: "Eastern Europe and Northern Asia",
            population: "~146 million",
            gdp: "~$12,000",
            import: "Machinery and equipment",
            export: "Oil and gas"
        },
        "Saudi Arabia": {
            location: "Middle East, Arabian Peninsula",
            population: "~35 million",
            gdp: "~$24,000",
            import: "Machinery and vehicles",
            export: "Crude oil"
        },
        "Brazil": {
            location: "South America",
            population: "~214 million",
            gdp: "~$8,000",
            import: "Machinery and electrical equipment",
            export: "Soybeans and iron ore"
        },
        "South Korea": {
            location: "East Asia",
            population: "~52 million",
            gdp: "~$34,000",
            import: "Crude oil and semiconductors",
            export: "Electronics and vehicles"
        },
        "Germany": {
            location: "Central Europe",
            population: "~83 million",
            gdp: "~$50,000",
            import: "Machinery and electronics",
            export: "Vehicles and machinery"
        },
        "Canada": {
            location: "North America",
            population: "~38 million",
            gdp: "~$52,000",
            import: "Machinery and vehicles",
            export: "Crude oil and vehicles"
        },
        "Iran": {
            location: "Middle East",
            population: "~85 million",
            gdp: "~$5,000",
            import: "Machinery and food products",
            export: "Crude oil"
        },
        "Mexico": {
            location: "North America",
            population: "~126 million",
            gdp: "~$9,000",
            import: "Machinery and electrical equipment",
            export: "Vehicles and electronics"
        },
        "France": {
            location: "Western Europe",
            population: "~67 million",
            gdp: "~$45,000",
            import: "Machinery and vehicles",
            export: "Aircraft and machinery"
        },
        "Indonesia": {
            location: "Southeast Asia",
            population: "~273 million",
            gdp: "~$4,000",
            import: "Machinery and chemicals",
            export: "Palm oil and coal"
        },
        "UK": {
            location: "Western Europe",
            population: "~67 million",
            gdp: "~$46,000",
            import: "Machinery and vehicles",
            export: "Machinery and vehicles"
        },
        "Singapore": {
            location: "Southeast Asia",
            population: "~5.7 million",
            gdp: "~$60,000",
            import: "Machinery and electronics",
            export: "Electronics and chemicals"
        },
        "Italy": {
            location: "Southern Europe",
            population: "~60 million",
            gdp: "~$35,000",
            import: "Machinery and chemicals",
            export: "Machinery and vehicles"
        },
        "Spain": {
            location: "Southern Europe",
            population: "~47 million",
            gdp: "~$30,000",
            import: "Machinery and vehicles",
            export: "Vehicles and machinery"
        },
        "Thailand": {
            location: "Southeast Asia",
            population: "~70 million",
            gdp: "~$7,000",
            import: "Machinery and chemicals",
            export: "Electronics and vehicles"
        },
        "Australia": {
            location: "Oceania",
            population: "~26 million",
            gdp: "~$55,000",
            import: "Machinery and vehicles",
            export: "Iron ore and coal"
        },
        "Taiwan": {
            location: "East Asia",
            population: "~23 million",
            gdp: "~$33,000",
            import: "Machinery and electrical equipment",
            export: "Electronics and machinery"
        },
        "UAE": {
            location: "Middle East, Arabian Peninsula",
            population: "~10 million",
            gdp: "~$43,000",
            import: "Machinery and vehicles",
            export: "Crude oil"
        },
        "Egypt": {
            location: "North Africa",
            population: "~104 million",
            gdp: "~$3,500",
            import: "Machinery and food products",
            export: "Crude oil and textiles"
        },
        "Netherlands": {
            location: "Western Europe",
            population: "~17 million",
            gdp: "~$58,000",
            import: "Machinery and electronics",
            export: "Machinery and chemicals"
        },
        "Turkey": {
            location: "Southeastern Europe and Western Asia",
            population: "~85 million",
            gdp: "~$9,000",
            import: "Machinery and chemicals",
            export: "Vehicles and machinery"
        },
        "Malaysia": {
            location: "Southeast Asia",
            population: "~33 million",
            gdp: "~$11,000",
            import: "Machinery and chemicals",
            export: "Electronics and palm oil"
        },
        "Venezuela": {
            location: "Northern South America",
            population: "~29 million",
            gdp: "~$3,000",
            import: "Machinery and food products",
            export: "Crude oil"
        },
        "Argentina": {
            location: "Southern South America",
            population: "~45 million",
            gdp: "~$10,000",
            import: "Machinery and vehicles",
            export: "Soybeans and vehicles"
        },
        "South Africa": {
            location: "Southern Africa",
            population: "~60 million",
            gdp: "~$6,000",
            import: "Machinery and chemicals",
            export: "Minerals and vehicles"
        },
        "Belgium": {
            location: "Western Europe",
            population: "~11.5 million",
            gdp: "~$50,000",
            import: "Machinery and vehicles",
            export: "Machinery and chemicals"
        },
        "Pakistan": {
            location: "South Asia",
            population: "~240 million",
            gdp: "~$1,300",
            import: "Machinery and oil",
            export: "Textiles and rice"
        },
        "Poland": {
            location: "Central Europe",
            population: "~38 million",
            gdp: "~$19,000",
            import: "Machinery and vehicles",
            export: "Machinery and vehicles"
        },
        "Kuwait": {
            location: "Middle East, Arabian Peninsula",
            population: "~4.3 million",
            gdp: "~$28,000",
            import: "Machinery and vehicles",
            export: "Crude oil"
        },
        "Vietnam": {
            location: "Southeast Asia",
            population: "~98 million",
            gdp: "~$4,000",
            import: "Machinery and electronics",
            export: "Electronics and textiles"
        },
        "Algeria": {
            location: "North Africa",
            population: "~44 million",
            gdp: "~$4,000",
            import: "Machinery and food products",
            export: "Crude oil and natural gas"
        },
        "Philippines": {
            location: "Southeast Asia",
            population: "~113 million",
            gdp: "~$3,500",
            import: "Machinery and transport equipment",
            export: "Electronics and semiconductors"
        },
        "Hong Kong": {
            location: "East Asia",
            population: "~7.5 million",
            gdp: "~$49,000",
            import: "Machinery and transport equipment",
            export: "Electronics and machinery"
        },
        "Chile": {
            location: "South America",
            population: "~19 million",
            gdp: "~$15,000",
            import: "Machinery and vehicles",
            export: "Copper and fruit"
        },
        "Colombia": {
            location: "Northwestern South America",
            population: "~52 million",
            gdp: "~$6,500",
            import: "Machinery and transportation equipment",
            export: "Crude oil"
        },
        "Sweden": {
            location: "Northern Europe",
            population: "~10.5 million",
            gdp: "~$54,000",
            import: "Machinery and vehicles",
            export: "Machinery and vehicles"
        },
        "Kazakhstan": {
            location: "Central Asia",
            population: "~19 million",
            gdp: "~$10,000",
            import: "Machinery and vehicles",
            export: "Oil and metals"
        },
        "Austria": {
            location: "Central Europe",
            population: "~9 million",
            gdp: "~$52,000",
            import: "Machinery and vehicles",
            export: "Machinery and vehicles"
        },
        "Ecuador": {
            location: "Northwestern South America",
            population: "~18 million",
            gdp: "~$6,000",
            import: "Machinery and vehicles",
            export: "Crude oil and bananas"
        },
        "Portugal": {
            location: "Southern Europe",
            population: "~10 million",
            gdp: "~$26,000",
            import: "Machinery and vehicles",
            export: "Machinery and vehicles"
        },
        "Peru": {
            location: "Western South America",
            population: "~34 million",
            gdp: "~$6,000",
            import: "Machinery and vehicles",
            export: "Copper and gold"
        },
        "Switzerland": {
            location: "Central Europe",
            population: "~8.7 million",
            gdp: "~$85,000",
            import: "Machinery and vehicles",
            export: "Pharmaceuticals and machinery"
        },
        "Romania": {
            location: "Southeastern Europe",
            population: "~19 million",
            gdp: "~$15,000",
            import: "Machinery and vehicles",
            export: "Machinery and vehicles"
        },
        "Ukraine": {
            location: "Eastern Europe",
            population: "~39 million",
            gdp: "~$3,000",
            import: "Machinery and vehicles",
            export: "Grain and metals"
        },
        "Finland": {
            location: "Northern Europe",
            population: "~5.5 million",
            gdp: "~$53,000",
            import: "Petroleum products",
            export: "Machinery and equipment"
        },
        "Denmark": {
            location: "Northern Europe",
            population: "~5.8 million",
            gdp: "~$65,000",
            import: "Machinery and vehicles",
            export: "Machinery and pharmaceuticals"
        },
        "New Zealand": {
            location: "Oceania",
            population: "~5.1 million",
            gdp: "~$47,000",
            import: "Machinery and vehicles",
            export: "Dairy products and meat"
        },
        "Belarus": {
            location: "Eastern Europe",
            population: "~9.3 million",
            gdp: "~$6,000",
            import: "Machinery and vehicles",
            export: "Machinery and vehicles"
        },
        "Hungary": {
            location: "Central Europe",
            population: "~9.6 million",
            gdp: "~$18,000",
            import: "Machinery and vehicles",
            export: "Machinery and vehicles"
        },
        "Ireland": {
            location: "Western Europe",
            population: "~5 million",
            gdp: "~$110,000",
            import: "Machinery and chemicals",
            export: "Pharmaceuticals and machinery"
        },
        "Turkmenistan": {
            location: "Central Asia",
            population: "~6.2 million",
            gdp: "~$7,000",
            import: "Machinery and food products",
            export: "Natural gas"
        },
        "Bangladesh": {
            location: "South Asia",
            population: "~170 million",
            gdp: "~$2,500",
            import: "Machinery and electrical equipment",
            export: "Textiles and garments"
        },
        "Azerbaijan": {
            location: "Caucasus, Eurasia",
            population: "~10 million",
            gdp: "~$5,000",
            import: "Machinery and vehicles",
            export: "Crude oil and natural gas"
        },
        "Bulgaria": {
            location: "Southeastern Europe, Balkan Peninsula",
            population: "~6.8 million",
            gdp: "~$12,000",
            import: "Machinery and equipment",
            export: "Refined petroleum and clothing"
        },
        "Slovakia": {
            location: "Central Europe",
            population: "~5.4 million",
            gdp: "~$20,000",
            import: "Machinery and vehicles",
            export: "Vehicles and machinery"
        },
        "Uzbekistan": {
            location: "Central Asia",
            population: "~35 million",
            gdp: "~$2,000",
            import: "Machinery and vehicles",
            export: "Cotton and natural gas"
        },
        "Lithuania": {
            location: "Northern Europe, Baltic region",
            population: "~2.8 million",
            gdp: "~$25,000",
            import: "Machinery and vehicles",
            export: "Machinery and refined petroleum"
        },
        "Trinidad and Tobago": {
            location: "Caribbean, near South America",
            population: "~1.4 million",
            gdp: "~$15,000",
            import: "Machinery and food products",
            export: "Natural gas and petroleum products"
        }
    };

    if (country && countryData[country]) {
        document.getElementById('location').textContent = countryData[country].location;
        document.getElementById('population').textContent = countryData[country].population;
        document.getElementById('gdp').textContent = countryData[country].gdp;
        document.getElementById('import').textContent = countryData[country].import;
        document.getElementById('export').textContent = countryData[country].export;
    } else {
        // Clear fields if no data available
        document.getElementById('location').textContent = "";
        document.getElementById('population').textContent = "";
        document.getElementById('gdp').textContent = "";
        document.getElementById('import').textContent = "";
        document.getElementById('export').textContent = "";
    }
}
