/**
 * Instant Weather V2 - Application de prévisions météorologiques
 * Auteur: Développé selon les spécifications du projet
 */

class InstantWeather {
    constructor() {
        // Configuration des APIs
        this.apiConfig = {
            communesUrl: 'https://geo.api.gouv.fr/communes',
            meteoToken: '3a3f9bcb0544770ab9b5c80d5cf19339cde32f819e06f43327c1abbb87083d5e', // À remplacer par votre token
            meteoUrl: 'https://api.meteo-concept.com/api/forecast/daily'
        };
        
        // État de l'application
        this.state = {
            selectedDays: 1,
            selectedCommune: null,
            searchHistory: this.loadSearchHistory(),
            isDarkMode: this.loadDarkMode()
        };
        
        // Éléments du DOM
        this.elements = {
            postalCodeInput: document.getElementById('postalCode'),
            communeGroup: document.getElementById('communeGroup'),
            communeSelect: document.getElementById('communeSelect'),
            dayButtons: document.querySelectorAll('.day-btn'),
            additionalInfoCheckboxes: document.querySelectorAll('input[name="additionalInfo"]'),
            weatherForm: document.getElementById('weatherForm'),
            submitBtn: document.querySelector('.submit-btn'),
            btnText: document.querySelector('.btn-text'),
            loader: document.querySelector('.loader'),
            resultsSection: document.getElementById('resultsSection'),
            weatherCards: document.getElementById('weatherCards'),
            errorSection: document.getElementById('errorSection'),
            errorText: document.getElementById('errorText'),
            darkModeToggle: document.getElementById('darkModeToggle'),
            searchHistory: document.getElementById('searchHistory'),
            clearHistoryBtn: document.getElementById('clearHistory')
        };
        
        this.init();
    }
    
    /**
     * Initialisation de l'application
     */
    init() {
        this.setupEventListeners();
        this.initializeDarkMode();
        this.renderSearchHistory();
        this.updateSubmitButtonState();
    }
    
    /**
     * Configuration des écouteurs d'événements
     */
    setupEventListeners() {
        // Code postal - recherche des communes
        this.elements.postalCodeInput.addEventListener('input', 
            this.debounce(this.handlePostalCodeInput.bind(this), 500)
        );
        
        // Sélection de commune
        this.elements.communeSelect.addEventListener('change', this.handleCommuneSelection.bind(this));
        
        // Sélection du nombre de jours
        this.elements.dayButtons.forEach(btn => {
            btn.addEventListener('click', this.handleDaySelection.bind(this));
        });
        
        // Soumission du formulaire
        this.elements.weatherForm.addEventListener('submit', this.handleFormSubmit.bind(this));
        
        // Mode sombre
        this.elements.darkModeToggle.addEventListener('click', this.toggleDarkMode.bind(this));
        
        // Historique
        this.elements.clearHistoryBtn.addEventListener('click', this.clearSearchHistory.bind(this));
        
        // Mise à jour de l'état du bouton selon les changements
        this.elements.postalCodeInput.addEventListener('input', this.updateSubmitButtonState.bind(this));
        this.elements.communeSelect.addEventListener('change', this.updateSubmitButtonState.bind(this));
    }
    
    /**
     * Fonction de debounce pour limiter les appels API
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    /**
     * Gestion de la saisie du code postal
     */
    async handlePostalCodeInput(event) {
        const postalCode = event.target.value.trim();
        
        if (postalCode.length === 5 && /^\d{5}$/.test(postalCode)) {
            try {
                await this.fetchCommunes(postalCode);
            } catch (error) {
                this.showError('Erreur lors de la recherche des communes');
                console.error('Erreur communes:', error);
            }
        } else {
            this.hideCommuneSelection();
        }
    }
    
    /**
     * Récupération des communes depuis l'API
     */
    async fetchCommunes(postalCode) {
        try {
            const response = await fetch(`${this.apiConfig.communesUrl}?codePostal=${postalCode}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const communes = await response.json();
            
            if (communes.length === 0) {
                this.showError('Aucune commune trouvée pour ce code postal');
                this.hideCommuneSelection();
                return;
            }
            
            this.populateCommuneSelect(communes);
            this.showCommuneSelection();
            
        } catch (error) {
            this.showError('Erreur lors de la recherche des communes');
            console.error('Erreur API communes:', error);
        }
    }
    
    /**
     * Remplissage du sélecteur de communes
     */
    populateCommuneSelect(communes) {
        this.elements.communeSelect.innerHTML = '<option value="">Sélectionnez une commune</option>';
        
        communes.forEach(commune => {
            const option = document.createElement('option');
            option.value = JSON.stringify({
                nom: commune.nom,
                code: commune.code,
                lat: commune.centre?.coordinates?.[1] || 0,
                lon: commune.centre?.coordinates?.[0] || 0
            });
            option.textContent = `${commune.nom} (${commune.code})`;
            this.elements.communeSelect.appendChild(option);
        });
    }
    
    /**
     * Affichage du sélecteur de communes
     */
    showCommuneSelection() {
        this.elements.communeGroup.style.display = 'block';
        this.elements.communeGroup.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    /**
     * Masquage du sélecteur de communes
     */
    hideCommuneSelection() {
        this.elements.communeGroup.style.display = 'none';
        this.elements.communeSelect.innerHTML = '<option value="">Sélectionnez une commune</option>';
        this.state.selectedCommune = null;
    }
    
    /**
     * Gestion de la sélection de commune
     */
    handleCommuneSelection(event) {
        if (event.target.value) {
            this.state.selectedCommune = JSON.parse(event.target.value);
        } else {
            this.state.selectedCommune = null;
        }
        this.updateSubmitButtonState();
    }
    
    /**
     * Gestion de la sélection du nombre de jours
     */
    handleDaySelection(event) {
        event.preventDefault();
        
        // Mise à jour de l'interface
        this.elements.dayButtons.forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
        });
        
        event.target.classList.add('active');
        event.target.setAttribute('aria-pressed', 'true');
        
        // Mise à jour de l'état
        this.state.selectedDays = parseInt(event.target.dataset.days);
    }
    
    /**
     * Mise à jour de l'état du bouton de soumission
     */
    updateSubmitButtonState() {
        const isValid = this.elements.postalCodeInput.value.length === 5 && 
                       /^\d{5}$/.test(this.elements.postalCodeInput.value) &&
                       this.state.selectedCommune;
        
        this.elements.submitBtn.disabled = !isValid;
    }
    
    /**
     * Gestion de la soumission du formulaire
     */
    async handleFormSubmit(event) {
        event.preventDefault();
        
        if (!this.state.selectedCommune) {
            this.showError('Veuillez sélectionner une commune');
            return;
        }
        
        this.showLoading(true);
        this.hideError();
        
        try {
            const weatherData = await this.fetchWeatherData();
            this.displayWeatherResults(weatherData);
            this.addToSearchHistory();
        } catch (error) {
            this.showError('Erreur lors de la récupération des données météo');
            console.error('Erreur météo:', error);
        } finally {
            this.showLoading(false);
        }
    }
    
    /**
     * Récupération des données météorologiques
     */
    async fetchWeatherData() {
        // Note: Remplacez par votre vrai token API
        const url = `${this.apiConfig.meteoUrl}?token=${this.apiConfig.meteoToken}&insee=${this.state.selectedCommune.code}`;
        
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data.forecast?.slice(0, this.state.selectedDays) || [];
            
        } catch (error) {
            // Simulation de données pour la démonstration
            console.warn('API non accessible, utilisation de données simulées');
            return this.generateMockWeatherData();
        }
    }
    
    /**
     * Génération de données météo simulées pour la démonstration
     */
    generateMockWeatherData() {
        const mockData = [];
        const today = new Date();
        
        for (let i = 0; i < this.state.selectedDays; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            
            mockData.push({
                datetime: date.toISOString().split('T')[0],
                tmin: Math.floor(Math.random() * 10) + 5,
                tmax: Math.floor(Math.random() * 15) + 15,
                probarain: Math.floor(Math.random() * 100),
                sun_hours: Math.floor(Math.random() * 12),
                rr10: Math.floor(Math.random() * 20),
                wind10m: Math.floor(Math.random() * 30) + 5,
                dirwind10m: Math.floor(Math.random() * 360),
                weather: Math.floor(Math.random() * 10)
            });
        }
        
        return mockData;
    }
    
    /**
     * Affichage des résultats météorologiques
     */
    displayWeatherResults(weatherData) {
        this.elements.weatherCards.innerHTML = '';
        
        weatherData.forEach((dayData, index) => {
            const card = this.createWeatherCard(dayData, index);
            this.elements.weatherCards.appendChild(card);
        });
        
        this.elements.resultsSection.style.display = 'block';
        this.elements.resultsSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    /**
     * Création d'une carte météo
     */
    createWeatherCard(dayData, index) {
        const card = document.createElement('div');
        card.className = 'weather-card';
        card.style.animationDelay = `${index * 0.1}s`;
        
        const date = new Date(dayData.datetime);
        const formattedDate = date.toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const weatherIcon = this.getWeatherIcon(dayData.weather);
        
        card.innerHTML = `
            <div class="card-header">
                <div class="card-date">${formattedDate}</div>
                <span class="material-symbols-rounded">${weatherIcon}</span>
            </div>
            
            <div class="card-main-info">
                <div class="info-item">
                    <div class="info-label">Temp. Min</div>
                    <div class="info-value">${dayData.tmin}°C</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Temp. Max</div>
                    <div class="info-value">${dayData.tmax}°C</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Prob. Pluie</div>
                    <div class="info-value">${dayData.probarain}%</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Ensoleillement</div>
                    <div class="info-value">${dayData.sun_hours}h</div>
                </div>
            </div>
            
            ${this.generateAdditionalInfo(dayData)}
        `;
        
        return card;
    }
    
    /**
     * Génération des informations supplémentaires
     */
    generateAdditionalInfo(dayData) {
        const selectedOptions = Array.from(this.elements.additionalInfoCheckboxes)
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.value);
        
        if (selectedOptions.length === 0) {
            return '';
        }
        
        let additionalHTML = '<div class="card-additional-info">';
        
        selectedOptions.forEach(option => {
            switch (option) {
                case 'latitude':
                    additionalHTML += `
                        <div class="additional-item">
                            <div class="additional-label">Latitude</div>
                            <div class="additional-value">${this.state.selectedCommune.lat.toFixed(4)}°</div>
                        </div>
                    `;
                    break;
                case 'longitude':
                    additionalHTML += `
                        <div class="additional-item">
                            <div class="additional-label">Longitude</div>
                            <div class="additional-value">${this.state.selectedCommune.lon.toFixed(4)}°</div>
                        </div>
                    `;
                    break;
                case 'rain':
                    additionalHTML += `
                        <div class="additional-item">
                            <div class="additional-label">Cumul Pluie</div>
                            <div class="additional-value">${dayData.rr10} mm</div>
                        </div>
                    `;
                    break;
                case 'wind':
                    additionalHTML += `
                        <div class="additional-item">
                            <div class="additional-label">Vent Moy.</div>
                            <div class="additional-value">${dayData.wind10m} km/h</div>
                        </div>
                    `;
                    break;
                case 'windDirection':
                    additionalHTML += `
                        <div class="additional-item">
                            <div class="additional-label">Dir. Vent</div>
                            <div class="additional-value">${dayData.dirwind10m}° ${this.getWindDirection(dayData.dirwind10m)}</div>
                        </div>
                    `;
                    break;
            }
        });
        
        additionalHTML += '</div>';
        return additionalHTML;
    }
    
    /**
     * Obtention de l'icône météo selon le code weather
     */
    getWeatherIcon(weatherCode) {
        const icons = {
          0: "wb_sunny",             // Soleil
          1: "partly_cloudy_day",    // Peu nuageux
          2: "partly_cloudy_day",    // Ciel voilé
          3: "cloud",                // Nuageux
          4: "cloud",                // Très nuageux
          5: "cloud",                // Couvert
          6: "foggy",                // Brouillard
          7: "foggy",                // Brouillard givrant

          // Pluie
          10: "rainy",               // Pluie faible
          11: "rainy",               // Pluie modérée
          12: "rainy_heavy",         // Pluie forte
          13: "rainy_snow",          // Pluie faible verglaçante
          14: "rainy_snow",          // Pluie modérée verglaçante
          15: "rainy_snow",          // Pluie forte verglaçante
          16: "grain",               // Bruine

          // Neige
          20: "weather_snowy",       // Neige faible
          21: "snowing",             // Neige modérée
          22: "snowing_heavy",       // Neige forte

          // Pluie et neige mêlées
          30: "rainy_snow",          // Pluie et neige mêlées faibles
          31: "rainy_snow",          // Pluie et neige mêlées modérées
          32: "rainy_snow",          // Pluie et neige mêlées fortes

          // Averses de pluie
          40: "rainy",               // Averses de pluie locales et faibles
          41: "rainy",               // Averses de pluie locales
          42: "rainy_heavy",         // Averses locales et fortes
          43: "rainy",               // Averses de pluie faibles
          44: "rainy",               // Averses de pluie
          45: "rainy_heavy",         // Averses de pluie fortes
          46: "rainy",               // Averses de pluie faibles et fréquentes
          47: "rainy",               // Averses de pluie fréquentes
          48: "rainy_heavy",         // Averses de pluie fortes et fréquentes

          // Averses de neige
          60: "weather_snowy",       // Averses de neige localisées et faibles
          61: "snowing",             // Averses de neige localisées
          62: "snowing_heavy",       // Averses de neige localisées et fortes
          63: "weather_snowy",       // Averses de neige faibles
          64: "snowing",             // Averses de neige
          65: "snowing_heavy",       // Averses de neige fortes
          66: "weather_snowy",       // Averses de neige faibles et fréquentes
          67: "snowing",             // Averses de neige fréquentes
          68: "snowing_heavy",       // Averses de neige fortes et fréquentes

          // Averses de pluie et neige mêlées
          70: "rainy_snow",         // Averses de pluie et neige mêlées localisées et faibles
          71: "rainy_snow",         // Averses de pluie et neige mêlées localisées
          72: "rainy_snow",         // Averses de pluie et neige mêlées localisées et fortes
          73: "rainy_snow",         // Averses de pluie et neige mêlées faibles
          74: "rainy_snow",         // Averses de pluie et neige mêlées
          75: "rainy_snow",         // Averses de pluie et neige mêlées fortes
          76: "rainy_snow",         // Averses de pluie et neige mêlées faibles et nombreuses
          77: "rainy_snow",         // Averses de pluie et neige mêlées fréquentes
          78: "rainy_snow",         // Averses de pluie et neige mêlées fortes et fréquentes

          // Orages
          100: "thunderstorm",       // Orages faibles et locaux
          101: "thunderstorm",       // Orages locaux
          102: "thunderstorm",       // Orages forts et locaux
          103: "thunderstorm",       // Orages faibles
          104: "thunderstorm",       // Orages
          105: "thunderstorm",       // Orages forts
          106: "thunderstorm",       // Orages faibles et fréquents
          107: "thunderstorm",       // Orages fréquents
          108: "thunderstorm",       // Orages forts et fréquents

          // Orages de neige ou grésil
          120: "thunderstorm",       // Orages faibles et locaux de neige ou grésil
          121: "thunderstorm",       // Orages locaux de neige ou grésil
          122: "thunderstorm",       // Orages forts et locaux de neige ou grésil
          123: "thunderstorm",       // Orages faibles de neige ou grésil
          124: "thunderstorm",       // Orages de neige ou grésil
          125: "thunderstorm",       // Orages forts de neige ou grésil
          126: "thunderstorm",       // Orages faibles et fréquents de neige ou grésil
          127: "thunderstorm",       // Orages fréquents de neige ou grésil
          128: "thunderstorm",       // Orages forts et fréquents de neige ou grésil

          // Orages de pluie et neige mêlées ou grésil
          130: "thunderstorm",       // Orages faibles et locaux de pluie et neige mêlées ou grésil
          131: "thunderstorm",       // Orages locaux de pluie et neige mêlées ou grésil
          132: "thunderstorm",       // Orages forts et locaux de pluie et neige mêlées ou grésil
          133: "thunderstorm",       // Orages faibles de pluie et neige mêlées ou grésil
          134: "thunderstorm",       // Orages de pluie et neige mêlées ou grésil
          135: "thunderstorm",       // Orages forts de pluie et neige mêlées ou grésil
          136: "thunderstorm",       // Orages faibles et fréquents de pluie et neige mêlées ou grésil
          137: "thunderstorm",       // Orages fréquents de pluie et neige mêlées ou grésil
          138: "thunderstorm",       // Orages forts et fréquents de pluie et neige mêlées ou grésil

          // Pluies orageuses
          140: "thunderstorm",       // Pluies orageuses
          141: "thunderstorm",       // Pluie et neige mêlées à caractère orageux
          142: "thunderstorm",       // Neige à caractère orageux

          // Pluies intermittentes
          210: "rainy",              // Pluie faible intermittente
          211: "rainy",              // Pluie modérée intermittente
          212: "rainy_heavy",        // Pluie forte intermittente

          // Pluies intermittentes
          220: "weather_snowy",      // Neige faible intermittente
          221: "snowing",            // Neige modérée intermittente
          222: "snowing_heavy",      // Neige forte intermittente

          // Autres
          230: "rainy_snow",         // Pluie et neige mêlées
          231: "rainy_snow",         // Pluie et neige mêlées
          232: "rainy_snow",         // Pluie et neige mêlées
          235: "weather_hail"        // Averses de grêle
        };
        
        return icons[weatherCode] || "help_outline";
    }
    
    /**
     * Conversion de la direction du vent en point cardinal
     */
    getWindDirection(degrees) {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
        const index = Math.round(degrees / 45) % 8;
        return directions[index];
    }
    
    /**
     * Affichage du chargement
     */
    showLoading(show) {
        if (show) {
            this.elements.btnText.style.display = 'none';
            this.elements.loader.style.display = 'block';
            this.elements.submitBtn.disabled = true;
        } else {
            this.elements.btnText.style.display = 'block';
            this.elements.loader.style.display = 'none';
            this.updateSubmitButtonState();
        }
    }
    
    /**
     * Affichage des erreurs
     */
    showError(message) {
        this.elements.errorText.textContent = message;
        this.elements.errorSection.style.display = 'block';
        this.elements.resultsSection.style.display = 'none';
        this.elements.errorSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    /**
     * Masquage des erreurs
     */
    hideError() {
        this.elements.errorSection.style.display = 'none';
    }
    
    /**
     * Gestion du mode sombre
     */
    initializeDarkMode() {
        if (this.state.isDarkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }
    
    /**
     * Basculement du mode sombre
     */
    toggleDarkMode() {
        this.state.isDarkMode = !this.state.isDarkMode;
        
        if (this.state.isDarkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        
        this.saveDarkMode();
    }
    
    /**
     * Sauvegarde du mode sombre
     */
    saveDarkMode() {
        try {
            // Utilisation d'un cookie simple au lieu de localStorage
            document.cookie = `darkMode=${this.state.isDarkMode}; path=/; max-age=31536000`;
        } catch (error) {
            console.warn('Impossible de sauvegarder le mode sombre');
        }
    }
    
    /**
     * Chargement du mode sombre
     */
    loadDarkMode() {
        try {
            const cookies = document.cookie.split(';');
            const darkModeCookie = cookies.find(cookie => cookie.trim().startsWith('darkMode='));
            return darkModeCookie ? darkModeCookie.split('=')[1] === 'true' : false;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Ajout à l'historique de recherche
     */
    addToSearchHistory() {
        if (!this.state.selectedCommune) return;
        
        const searchItem = {
            commune: this.state.selectedCommune.nom,
            postalCode: this.elements.postalCodeInput.value,
            date: new Date().toLocaleDateString('fr-FR'),
            days: this.state.selectedDays
        };
        
        // Éviter les doublons
        this.state.searchHistory = this.state.searchHistory.filter(
            item => !(item.commune === searchItem.commune && item.postalCode === searchItem.postalCode)
        );
        
        // Ajouter en début de liste
        this.state.searchHistory.unshift(searchItem);
        
        // Limiter à 10 éléments
        this.state.searchHistory = this.state.searchHistory.slice(0, 10);
        
        this.saveSearchHistory();
        this.renderSearchHistory();
    }
    
    /**
     * Rendu de l'historique de recherche
     */
    renderSearchHistory() {
        const container = this.elements.searchHistory;
        
        if (this.state.searchHistory.length === 0) {
            container.innerHTML = '<p class="no-history">Aucune recherche récente</p>';
            this.elements.clearHistoryBtn.style.display = 'none';
            return;
        }
        
        container.innerHTML = '';
        this.elements.clearHistoryBtn.style.display = 'block';
        
        this.state.searchHistory.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <span>📍</span>
                <span>${item.commune} (${item.postalCode})</span>
                <span>• ${item.days} jour${item.days > 1 ? 's' : ''}</span>
                <span>• ${item.date}</span>
            `;
            
            historyItem.addEventListener('click', () => {
                this.loadFromHistory(item);
            });
            
            container.appendChild(historyItem);
        });
    }
    
    /**
     * Charger une recherche depuis l'historique
     */
    async loadFromHistory(historyItem) {
        this.elements.postalCodeInput.value = historyItem.postalCode;
        
        // Déclencher la recherche des communes
        await this.fetchCommunes(historyItem.postalCode);
        
        // Sélectionner la commune correspondante
        setTimeout(() => {
            const options = Array.from(this.elements.communeSelect.options);
            const matchingOption = options.find(option => {
                if (option.value) {
                    const communeData = JSON.parse(option.value);
                    return communeData.nom === historyItem.commune;
                }
                return false;
            });
            
            if (matchingOption) {
                this.elements.communeSelect.value = matchingOption.value;
                this.handleCommuneSelection({ target: this.elements.communeSelect });
            }
            
            // Sélectionner le nombre de jours
            this.elements.dayButtons.forEach(btn => {
                if (parseInt(btn.dataset.days) === historyItem.days) {
                    btn.click();
                }
            });
            
        }, 500);
    }
    
    /**
     * Sauvegarde de l'historique
     */
    saveSearchHistory() {
        try {
            document.cookie = `searchHistory=${JSON.stringify(this.state.searchHistory)}; path=/; max-age=31536000`;
        } catch (error) {
            console.warn('Impossible de sauvegarder l\'historique');
        }
    }
    
    /**
     * Chargement de l'historique
     */
    loadSearchHistory() {
        try {
            const cookies = document.cookie.split(';');
            const historyCookie = cookies.find(cookie => cookie.trim().startsWith('searchHistory='));
            return historyCookie ? JSON.parse(historyCookie.split('=')[1]) : [];
        } catch (error) {
            return [];
        }
    }
    
    /**
     * Effacement de l'historique
     */
    clearSearchHistory() {
        if (confirm('Êtes-vous sûr de vouloir effacer tout l\'historique ?')) {
            this.state.searchHistory = [];
            this.saveSearchHistory();
            this.renderSearchHistory();
        }
    }
}

// Classes pour les cartes météo (WeatherCard)
class WeatherCard {
    constructor(data, options = {}) {
        this.data = data;
        this.options = options;
        this.element = null;
    }
    
    render() {
        this.element = document.createElement('div');
        this.element.className = 'weather-card';
        
        // Implémentation du rendu de la carte
        // Cette classe peut être étendue pour des fonctionnalités avancées
        
        return this.element;
    }
    
    update(newData) {
        this.data = newData;
        if (this.element) {
            // Mise à jour du contenu
        }
    }
    
    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

// Initialisation de l'application quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
    window.instantWeather = new InstantWeather();
    
});