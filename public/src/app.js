import { GameTree } from './gameTree.js';
import { GameTreeRenderer } from './renderer.js';

class GameTreeApp {
    constructor() {
        this.gameTree = new GameTree();
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new GameTreeRenderer(this.canvas, this.gameTree);
        
        this.initUI();
        this.setupEventListeners();
        
        // Add loading animation
        document.body.classList.add('loading');
        setTimeout(() => {
            document.body.classList.remove('loading');
        }, 500);
    }

    initUI() {
        document.getElementById('player-count').addEventListener('change', (e) => {
            const count = parseInt(e.target.value);
            this.gameTree.setPlayerCount(count);
            this.updatePlayerNamesInput();
            this.renderer.render();
        });
        
        document.getElementById('player-names').addEventListener('change', (e) => {
            const names = e.target.value.split(',').map(name => name.trim());
            this.gameTree.setPlayerNames(names);
            this.renderer.render();
        });
        
        this.updatePlayerNamesInput();
    }

    updatePlayerNamesInput() {
        const namesInput = document.getElementById('player-names');
        const defaultNames = Array(this.gameTree.playerCount)
            .fill()
            .map((_, i) => `Гравець ${i + 1}`)
            .join(', ');
        
        namesInput.value = this.gameTree.playerNames.join(', ') || defaultNames;
        namesInput.placeholder = defaultNames;
    }

    setupEventListeners() {
        document.getElementById('add-player-node').addEventListener('click', () => {
            if (!this.renderer.selectedNode && this.gameTree.nodes.length > 0) {
                alert('Будь ласка, оберіть вузол для додавання вузла гравця');
                return;
            }
            
            const parentId = this.renderer.selectedNode ? this.renderer.selectedNode.id : null;
            const node = this.gameTree.addNode('player', parentId);
            
            if (this.gameTree.nodes.length === 1) {
                this.gameTree.root = node.id;
            }
            
            // Add animation class
            node._animate = true;
            this.renderer.render();
            
            // Remove animation after delay
            setTimeout(() => {
                delete node._animate;
                this.renderer.render();
            }, 300);
        });
        
        document.getElementById('add-terminal-node').addEventListener('click', () => {
            if (!this.renderer.selectedNode) {
                alert('Будь ласка, оберіть вузол для додавання термінального вузла');
                return;
            }
            
            const node = this.gameTree.addNode('terminal', this.renderer.selectedNode.id, 
                `Дія ${this.renderer.selectedNode.children.length + 1}`);
            
            // Add animation class
            node._animate = true;
            this.renderer.render();
            
            setTimeout(() => {
                delete node._animate;
                this.renderer.render();
            }, 300);
        });
        
        document.getElementById('solve-game').addEventListener('click', () => {
            const solution = this.gameTree.solve();
            this.displaySolution(solution);
            this.renderer.highlightSolution(solution);
        });
        
        document.getElementById('clear-all').addEventListener('click', () => {
            if (confirm('Ви впевнені, що хочете очистити все дерево гри?')) {
                this.gameTree = new GameTree();
                this.renderer.gameTree = this.gameTree;
                this.renderer.selectedNode = null;
                this.renderer.render();
                document.getElementById('solution-content').innerHTML = '';
                this.updatePlayerNamesInput();
            }
        });
        
        document.addEventListener('nodeSelected', (e) => {
            this.showNodePropertiesForm(e.detail);
        });
        
        document.addEventListener('nodeDeselected', () => {
            this.hideNodePropertiesForm();
        });
    }

    showNodePropertiesForm(node) {
        const formContainer = document.getElementById('node-properties-form');
        formContainer.innerHTML = '';
        
        const idField = document.createElement('div');
        idField.innerHTML = `<strong>ID вузла:</strong> ${node.id}`;
        formContainer.appendChild(idField);
        
        // Додаємо управління розміром вузла
        const sizeField = document.createElement('div');
        sizeField.innerHTML = `
            <label for="node-size">Розмір вузла:</label>
            <input type="range" id="node-size" min="20" max="50" value="${node.radius || this.renderer.nodeRadius}">
            <span id="node-size-value">${node.radius || this.renderer.nodeRadius}</span>
        `;
        formContainer.appendChild(sizeField);
        
        // Оновлюємо значення при зміні повзунка
        document.getElementById('node-size').addEventListener('input', (e) => {
            document.getElementById('node-size-value').textContent = e.target.value;
        });
        
        const actionField = document.createElement('div');
        actionField.innerHTML = `
            <label for="node-action">Назва дії:</label>
            <input type="text" id="node-action" value="${node.action || ''}">
        `;
        formContainer.appendChild(actionField);
            
        if (node.type === 'player') {
            const playerSelect = document.createElement('div');
            playerSelect.innerHTML = `
                <label for="node-player">Гравець:</label>
                <select id="node-player">
                    ${this.gameTree.playerNames.map((name, i) => 
                        `<option value="${i}" ${node.player === i ? 'selected' : ''}>${name}</option>`
                    ).join('')}
                </select>
            `;
            formContainer.appendChild(playerSelect);
            
            const strategyField = document.createElement('div');
            strategyField.innerHTML = `
                <label for="node-strategy">Назва стратегії:</label>
                <input type="text" id="node-strategy" value="${node.strategy || ''}">
            `;
            formContainer.appendChild(strategyField);
        } else if (node.type === 'terminal') {
            const payoffsField = document.createElement('div');
            payoffsField.innerHTML = `
                <label>Виграші:</label>
                ${node.payoffs.map((payoff, i) => `
                    <div class="payoff-input">
                        <label>${this.gameTree.playerNames[i] || `Гравець ${i + 1}`}:</label>
                        <input type="number" class="payoff-value" data-player="${i}" value="${payoff}" step="0.1">
                    </div>
                `).join('')}
            `;
            formContainer.appendChild(payoffsField);
        }
        
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Зберегти зміни';
        saveButton.addEventListener('click', () => this.saveNodeProperties(node));
        formContainer.appendChild(saveButton);
        
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Видалити вузол';
        deleteButton.classList.add('delete-button');
        deleteButton.addEventListener('click', () => {
            if (confirm('Видалити цей вузол і всі його дочірні вузли?')) {
                this.gameTree.deleteNode(node.id);
                this.renderer.selectedNode = null;
                this.renderer.render();
                this.hideNodePropertiesForm();
            }
        });
        formContainer.appendChild(deleteButton);
    }

    hideNodePropertiesForm() {
        const formContainer = document.getElementById('node-properties-form');
        formContainer.innerHTML = '<p>Оберіть вузол для редагування</p>';
    }

    saveNodeProperties(node) {
        const sizeInput = document.getElementById('node-size');
        if (sizeInput) {
            const size = parseInt(sizeInput.value);
            if (size !== this.renderer.nodeRadius) {
                this.gameTree.updateNode(node.id, { radius: size });
            }
        }
        const actionInput = document.getElementById('node-action');
        if (actionInput) {
            const action = actionInput.value.trim();
            this.gameTree.updateNode(node.id, { action });
            
            if (node.parent !== null) {
                const edge = this.gameTree.edges.find(e => e.from === node.parent && e.to === node.id);
                if (edge) edge.action = action;
            }
        }
        
        if (node.type === 'player') {
            const playerSelect = document.getElementById('node-player');
            const strategyInput = document.getElementById('node-strategy');
            
            if (playerSelect && strategyInput) {
                this.gameTree.updateNode(node.id, {
                    player: parseInt(playerSelect.value),
                    strategy: strategyInput.value.trim()
                });
            }
        } else if (node.type === 'terminal') {
            const payoffInputs = document.querySelectorAll('.payoff-value');
            const payoffs = Array(this.gameTree.playerCount).fill(0);
            
            payoffInputs.forEach(input => {
                const player = parseInt(input.dataset.player);
                payoffs[player] = parseFloat(input.value) || 0;
            });
            
            this.gameTree.updateNode(node.id, { payoffs });
        }
        
        this.renderer.render();
    }

    displaySolution(solution) {
        const solutionContent = document.getElementById('solution-content');
        const stepsContent = document.getElementById('solution-steps');
        solutionContent.innerHTML = '';
        stepsContent.innerHTML = '';
        
        if (!solution) {
            solutionContent.innerHTML = '<p>Розв\'язок не знайдено.</p>';
            return;
        }
        
        if (solution.multipleSolutions) {
            const warning = document.createElement('div');
            warning.className = 'solution-warning';
            warning.innerHTML = `
                <h4>Увага: Гра має декілька SPNE розв'язків!</h4>
                <p>Це означає, що є декілька оптимальних стратегій, які дають однакові виграші.</p>
                <p>Показано один з можливих розв'язків.</p>
            `;
            solutionContent.appendChild(warning);
        }
        
        const payoffsSection = document.createElement('div');
        payoffsSection.innerHTML = `
            <h4>Очікувані виграші:</h4>
            <ul>
                ${solution.expectedPayoffs.map((payoff, i) => `
                    <li>${this.gameTree.playerNames[i] || `Гравець ${i + 1}`}: ${payoff.toFixed(2)}</li>
                `).join('')}
            </ul>
        `;
        solutionContent.appendChild(payoffsSection);
        
        const strategiesSection = document.createElement('div');
        strategiesSection.innerHTML = '<h4>Оптимальні стратегії:</h4>';
        
        const strategiesList = document.createElement('ul');
        for (const [nodeId, strategy] of Object.entries(solution.strategies)) {
            const node = this.gameTree.getNode(parseInt(nodeId));
            if (node) {
                const playerName = this.gameTree.playerNames[node.player] || `Гравець ${node.player + 1}`;
                const item = document.createElement('li');
                
                let strategyText = `<strong>${playerName} у вузлі ${nodeId}:</strong> ${strategy}`;
                
                if (solution.alternativeStrategies && solution.alternativeStrategies[nodeId]) {
                    strategyText += `<br><em>Альтернативні оптимальні дії: ${solution.alternativeStrategies[nodeId].join(', ')}</em>`;
                }
                
                item.innerHTML = strategyText;
                strategiesList.appendChild(item);
            }
        }
        
        strategiesSection.appendChild(strategiesList);
        solutionContent.appendChild(strategiesSection);
        
        if (solution.steps && solution.steps.length > 0) {
            const stepsSection = document.createElement('div');
            stepsSection.innerHTML = '<h4>Кроки розв\'язку (зворотна індукція):</h4>';
            
            const stepsList = document.createElement('ol');
            solution.steps.forEach(step => {
                const stepItem = document.createElement('li');
                stepItem.innerHTML = `<strong>${step.description}</strong>`;
                
                if (step.payoffs) {
                    const payoffsText = step.payoffs.map((p, i) => 
                        `${this.gameTree.playerNames[i] || `Гравець ${i + 1}`}: ${p.toFixed(2)}`
                    ).join(', ');
                    stepItem.innerHTML += `<br>Виграші: [${payoffsText}]`;
                }
                
                if (step.alternativeActions) {
                    stepItem.innerHTML += `<br>Примітка: Інші рівноцінні дії: ${step.alternativeActions.join(', ')}`;
                }
                
                stepsList.appendChild(stepItem);
            });
            
            stepsSection.appendChild(stepsList);
            stepsContent.appendChild(stepsSection);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new GameTreeApp();
});