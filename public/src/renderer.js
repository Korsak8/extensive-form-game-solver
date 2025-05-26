export class GameTreeRenderer {
    constructor(canvas, gameTree) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gameTree = gameTree;
        this.selectedNode = null;
        this.nodeRadius = 30; // Начальный размер узла
        this.minNodeRadius = 20;
        this.maxNodeRadius = 50;
        this.levelHeight = 100;
        this.horizontalSpacing = 80;
        this.dragStart = null;
        this.draggedNode = null;
        this.animationFrame = null;
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.setupEventListeners();
    }

    resizeCanvas() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
        this.render();
    }

    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    }

    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const clickedNode = this.findNodeAtPosition(x, y);
        this.selectedNode = clickedNode;
        
        if (clickedNode) {
            const event = new CustomEvent('nodeSelected', { detail: clickedNode });
            document.dispatchEvent(event);
        } else {
            const event = new CustomEvent('nodeDeselected');
            document.dispatchEvent(event);
        }
        
        this.render();
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const node = this.findNodeAtPosition(x, y);
        if (node) {
            this.dragStart = { x, y };
            this.draggedNode = node;
        }
    }

    handleMouseMove(e) {
        if (this.draggedNode && this.dragStart) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const dx = x - this.dragStart.x;
            const dy = y - this.dragStart.y;
            
            this.draggedNode.x += dx;
            this.draggedNode.y += dy;
            
            this.dragStart = { x, y };
            
            // Throttle rendering during drag
            if (!this.animationFrame) {
                this.animationFrame = requestAnimationFrame(() => {
                    this.render();
                    this.animationFrame = null;
                });
            }
        }
    }

    handleMouseUp(e) {
        this.dragStart = null;
        this.draggedNode = null;
    }

    findNodeAtPosition(x, y) {
        for (const node of this.gameTree.nodes) {
            if (!node.x || !node.y) continue;
            
            const distance = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
            if (distance <= this.nodeRadius) {
                return node;
            }
        }
        return null;
    }

    calculateLayout() {
        if (!this.gameTree.root) return;
        
        // Only calculate positions for nodes that don't have positions
        const nodesWithoutPosition = this.gameTree.nodes.filter(node => !node.x || !node.y);
        if (nodesWithoutPosition.length === 0) return;
        
        // Find the parent node for new nodes
        const parentNode = nodesWithoutPosition[0].parent !== null ? 
            this.gameTree.getNode(nodesWithoutPosition[0].parent) : null;
        
        if (parentNode) {
            // Position new nodes relative to their parent
            const newNodes = this.gameTree.nodes.filter(node => 
                node.parent === parentNode.id && (!node.x || !node.y)
            );
            
            // Calculate average position of existing siblings
            const siblings = this.gameTree.nodes.filter(node => 
                node.parent === parentNode.id && node.x && node.y
            );
            
            let startX, startY;
            if (siblings.length > 0) {
                // Position new nodes next to existing siblings
                const lastSibling = siblings[siblings.length - 1];
                startX = lastSibling.x + this.horizontalSpacing;
                startY = lastSibling.y;
            } else {
                // First child - position below parent with some offset
                startX = parentNode.x;
                startY = parentNode.y + this.levelHeight;
            }
            
            // Position new nodes
            newNodes.forEach((node, i) => {
                node.x = startX + (i * this.horizontalSpacing);
                node.y = startY;
            });
        } else {
            // Root node case
            const rootNode = this.gameTree.getNode(this.gameTree.root);
            if (!rootNode.x || !rootNode.y) {
                rootNode.x = this.canvas.width / 2;
                rootNode.y = 50;
            }
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Calculate positions only for new nodes
        this.calculateLayout();
        
        // Draw edges first
        for (const edge of this.gameTree.edges) {
            const fromNode = this.gameTree.getNode(edge.from);
            const toNode = this.gameTree.getNode(edge.to);
            
            if (fromNode && toNode && fromNode.x && fromNode.y && toNode.x && toNode.y) {
                this.drawEdge(fromNode, toNode, edge.action);
            }
        }
        
        // Draw nodes
        for (const node of this.gameTree.nodes) {
            if (node.x && node.y) {
                this.drawNode(node);
            }
        }
    }

    drawEdge(fromNode, toNode, action) {
        this.ctx.beginPath();
        this.ctx.moveTo(fromNode.x, fromNode.y + this.nodeRadius);
        this.ctx.lineTo(toNode.x, toNode.y - this.nodeRadius);
        
        // Gradient for edges
        const gradient = this.ctx.createLinearGradient(
            fromNode.x, fromNode.y,
            toNode.x, toNode.y
        );
        gradient.addColorStop(0, '#4361ee');
        gradient.addColorStop(1, '#7209b7');
        
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Draw action label
        if (action) {
            const midX = (fromNode.x + toNode.x) / 2;
            const midY = (fromNode.y + toNode.y) / 2;
            
            this.ctx.fillStyle = '#2b2d42';
            this.ctx.font = '13px Inter';
            this.ctx.textAlign = 'center';
            
            // Background for better readability
            this.ctx.fillStyle = 'white';
            this.ctx.fillRect(midX - 30, midY - 20, 60, 20);
            
            this.ctx.fillStyle = '#2b2d42';
            this.ctx.fillText(action, midX, midY - 5);
        }
    }

    drawNode(node) {
        // Определяем радиус узла (может быть переопределен для конкретного узла)
        const radius = node.radius || this.nodeRadius;
        
        // Shadow effect
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetY = 4;
        
        // Draw node circle
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        
        // Node colors
        if (node.type === 'terminal') {
            this.ctx.fillStyle = '#f8f9fa';
        } else {
            const playerColors = ['#4cc9f0', '#4895ef', '#4361ee', '#3a0ca3'];
            this.ctx.fillStyle = playerColors[node.player || 0] || '#4361ee';
        }
        
        this.ctx.fill();
        
        // Border
        this.ctx.strokeStyle = node.id === this.selectedNode?.id ? '#f72585' : '#2b2d42';
        this.ctx.lineWidth = node.id === this.selectedNode?.id ? 3 : 2;
        this.ctx.stroke();
        
        // Reset shadow
        this.ctx.shadowColor = 'transparent';
        
        // Draw node label
        this.ctx.fillStyle = '#2b2d42';
        this.ctx.textAlign = 'center';
        
        if (node.type === 'terminal') {
            // For terminal nodes, show payoffs
            const payoffText = node.payoffs.map(p => p.toFixed(1)).join(', ');
            this.ctx.font = `${Math.max(10, radius / 2)}px Inter`;
            this.ctx.fillText(payoffText, node.x, node.y + 5);
        } else if (node.type === 'player') {
            // For player nodes, show player name and strategy if any
            const playerName = this.gameTree.playerNames[node.player || 0] || `Player ${(node.player || 0) + 1}`;
            this.ctx.font = `${Math.max(12, radius / 2)}px Inter`;
            this.ctx.fillText(playerName, node.x, node.y - 5);
            
            if (node.strategy) {
                this.ctx.font = `${Math.max(10, radius / 2.5)}px Inter`;
                this.ctx.fillText(node.strategy, node.x, node.y + 15);
            }
        }
        
        // Draw node ID - улучшенное отображение
        this.ctx.font = 'bold 12px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#2b2d42';
        
        // Фон для номера узла
        this.ctx.beginPath();
        this.ctx.arc(node.x - radius + 15, node.y - radius + 15, 10, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fill();
        this.ctx.strokeStyle = '#2b2d42';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        // Текст номера узла
        this.ctx.fillStyle = '#2b2d42';
        this.ctx.fillText(`#${node.id}`, node.x - radius + 15, node.y - radius + 18);
    }

    highlightSolution(solution) {
        if (!solution) return;
        
        this.render(); // First render the normal tree
        
        const highlightPath = (nodeId) => {
            const node = this.gameTree.getNode(nodeId);
            if (!node) return;
            
            // Highlight circle
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, this.nodeRadius + 5, 0, Math.PI * 2);
            this.ctx.strokeStyle = '#4cc9f0';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
            
            if (node.type === 'player' && solution.strategies[nodeId]) {
                const strategy = solution.strategies[nodeId];
                const childEdge = this.gameTree.edges.find(edge => 
                    edge.from === nodeId && 
                    this.gameTree.getNode(edge.to).action === strategy
                );
                
                if (childEdge) {
                    const toNode = this.gameTree.getNode(childEdge.to);
                    
                    // Gradient for solution path
                    const gradient = this.ctx.createLinearGradient(
                        node.x, node.y,
                        toNode.x, toNode.y
                    );
                    gradient.addColorStop(0, '#4cc9f0');
                    gradient.addColorStop(1, '#4895ef');
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(node.x, node.y + this.nodeRadius);
                    this.ctx.lineTo(toNode.x, toNode.y - this.nodeRadius);
                    this.ctx.strokeStyle = gradient;
                    this.ctx.lineWidth = 4;
                    this.ctx.stroke();
                }
            }
            
            if (node.type === 'player') {
                const childId = node.children.find(childId => {
                    const child = this.gameTree.getNode(childId);
                    return child.action === solution.strategies[nodeId];
                });
                if (childId) highlightPath(childId);
            } else if (node.children.length > 0) {
                node.children.forEach(childId => highlightPath(childId));
            }
        };
        
        if (this.gameTree.root) highlightPath(this.gameTree.root);
    }
}