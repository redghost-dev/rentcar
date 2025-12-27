(function() {
    const API_URL = '/api/track-visit';

    function trackVisit() {
        const data = {
            referrer: document.referrer,
            page_url: window.location.href
        };

        fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        }).catch(err => {
            // Sessizce başarısız ol, kullanıcı deneyimini etkileme
            // console.error('Tracking error:', err); 
        });
    }

    // Sayfa yüklendiğinde gönder
    if (document.readyState === 'complete') {
        trackVisit();
    } else {
        window.addEventListener('load', trackVisit);
    }
})();