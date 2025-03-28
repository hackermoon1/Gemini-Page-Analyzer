(function() {
    const GEMINI_API_KEY = 'AIzaSyBhli8mGA1-1ZrFYD1FZzMFkHhDrdYCXwY';
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    const UI_SCRIPT_URL = 'https://res.cloudinary.com/dctxcezsd/raw/upload/v1743274354/ui.js';

    fetch(UI_SCRIPT_URL)
        .then(response => response.text())
        .then(script => {
            eval(script);

            let isAnalyzing = false;

            function setIsAnalyzing(value) {
                isAnalyzing = value;
            }

            function extractPageContent() {
                const contentArea = document.querySelector('body') || document.documentElement;
                const unwantedTags = ['script', 'style', 'noscript', 'svg', 'iframe', 'head'];
                unwantedTags.forEach(tag => contentArea.querySelectorAll(tag).forEach(el => el.remove()));

                const images = Array.from(document.querySelectorAll('img'))
                    .map(img => img.src)
                    .filter(src => src && src.startsWith('http') && !src.includes('edusp-static.ip.tv/sala-do-futuro')) // Filtra imagens do Sala do Futuro
                    .slice(0, 10); // Limite aumentado para 10

                const text = (contentArea.textContent || '').replace(/\s+/g, ' ').substring(0, 15000);
                return { text, images };
            }

            async function analyzeContent(content, question) {
                if (!question.trim()) return { answer: 'Por favor, cole uma pergunta com alternativas.', correctAlternative: '' };

                // Extrair URLs de imagens da pergunta (ex.: [Imagem: https://example.com/imagem.jpg])
                const imageUrlMatch = question.match(/\[Imagem: (https:\/\/[^\]]+)\]/);
                const imageUrl = imageUrlMatch ? imageUrlMatch[1] : null;
                const cleanedQuestion = question.replace(/\[Imagem: https:\/\/[^\]]+\]/, '').trim();

                const prompt = `Responda à seguinte pergunta com base no conteúdo da página e indique a alternativa correta (ex.: "A resposta correta é: B"). Se houver uma imagem, use-a como contexto adicional.\n\nPergunta:\n${cleanedQuestion}\n\nConteúdo:\nTexto: ${content.text}\nImagens: ${content.images.join(', ')}${imageUrl ? `\nImagem adicional: ${imageUrl}` : ''}\n\nResposta:`;

                try {
                    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }],
                            generationConfig: { maxOutputTokens: 200, temperature: 0.3 }
                        })
                    });
                    const data = await response.json();
                    const fullAnswer = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Resposta não encontrada';

                    const match = fullAnswer.match(/A resposta correta é: ([A-E])/i);
                    const correctAlternative = match ? match[1] : 'Não identificada';
                    const answerText = fullAnswer.replace(/A resposta correta é: [A-E]/i, '').trim();

                    return { answer: answerText, correctAlternative };
                } catch (error) {
                    console.error('Erro na API:', error);
                    return { answer: 'Erro ao analisar o conteúdo', correctAlternative: '' };
                } finally {
                    setIsAnalyzing(false);
                }
            }

            const { menuBtn, analyzeOption, clearOption, input, responsePanel } = window.createUI();

            menuBtn.addEventListener('click', () => {
                const menu = document.getElementById('gemini-menu');
                menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
            });

            analyzeOption.addEventListener('click', async () => {
                if (isAnalyzing) return;

                const question = input.value.trim();
                if (!question) {
                    window.showResponse(responsePanel, 'Por favor, cole uma pergunta com alternativas.', '');
                    return;
                }

                setIsAnalyzing(true);
                analyzeOption.disabled = true;
                analyzeOption.innerHTML = '<span style="margin-right: 8px;">⏳</span>Analisando...';
                analyzeOption.style.opacity = '0.7';

                const content = extractPageContent();
                const { answer, correctAlternative } = await analyzeContent(content, question);

                window.showResponse(responsePanel, answer, correctAlternative);

                analyzeOption.disabled = false;
                analyzeOption.innerHTML = '<span style="margin-right: 8px;">🔍</span>Analisar';
                analyzeOption.style.opacity = '1';
                document.getElementById('gemini-menu').style.display = 'none';
            });

            clearOption.addEventListener('click', () => {
                window.clearUI(input, responsePanel, analyzeOption, setIsAnalyzing);
                document.getElementById('gemini-menu').style.display = 'none';
            });

            document.addEventListener('click', e => {
                if (!e.target.closest('#gemini-helper-container') && !e.target.closest('#gemini-response-panel')) {
                    document.getElementById('gemini-menu').style.display = 'none';
                }
            });
        })
        .catch(error => console.error('Erro ao carregar ui.js:', error));
})();
