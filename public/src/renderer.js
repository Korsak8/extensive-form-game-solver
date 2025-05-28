export class GameTreeRenderer {
    constructor(canvas, gameTree) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gameTree = gameTree;
        this.selectedNode = null;
        this.nodeRadius = 30;
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
        
        const nodesWithoutPosition = this.gameTree.nodes.filter(node => !node.x || !node.y);
        if (nodesWithoutPosition.length === 0) return;
        
        const parentNode = nodesWithoutPosition[0].parent !== null ? 
            this.gameTree.getNode(nodesWithoutPosition[0].parent) : null;
        
        if (parentNode) {
            const newNodes = this.gameTree.nodes.filter(node => 
                node.parent === parentNode.id && (!node.x || !node.y)
            );
            
            const siblings = this.gameTree.nodes.filter(node => 
                node.parent === parentNode.id && node.x && node.y
            );
            
            let startX, startY;
            if (siblings.length > 0) {
                const lastSibling = siblings[siblings.length - 1];
                startX = lastSibling.x + this.horizontalSpacing;
                startY = lastSibling.y;
            } else {
                startX = parentNode.x;
                startY = parentNode.y + this.levelHeight;
            }
            
            newNodes.forEach((node, i) => {
                node.x = startX + (i * this.horizontalSpacing);
                node.y = startY;
            });
        } else {
            const rootNode = this.gameTree.getNode(this.gameTree.root);
            if (!rootNode.x || !rootNode.y) {
                rootNode.x = this.canvas.width / 2;
                rootNode.y = 50;
            }
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.calculateLayout();
        
        for (const edge of this.gameTree.edges) {
            const fromNode = this.gameTree.getNode(edge.from);
            const toNode = this.gameTree.getNode(edge.to);
            
            if (fromNode && toNode && fromNode.x && fromNode.y && toNode.x && toNode.y) {
                this.drawEdge(fromNode, toNode, edge.action);
            }
        }
        
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
        
        const gradient = this.ctx.createLinearGradient(
            fromNode.x, fromNode.y,
            toNode.x, toNode.y
        );
        gradient.addColorStop(0, '#4361ee');
        gradient.addColorStop(1, '#7209b7');
        
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        if (action) {
            const midX = (fromNode.x + toNode.x) / 2;
            const midY = (fromNode.y + toNode.y) / 2;
            
            this.ctx.fillStyle = '#2b2d42';
            this.ctx.font = '13px Inter';
            this.ctx.textAlign = 'center';
            
            this.ctx.fillStyle = 'white';
            this.ctx.fillRect(midX - 30, midY - 20, 60, 20);
            
            this.ctx.fillStyle = '#2b2d42';
            this.ctx.fillText(action, midX, midY - 5);
        }
    }

    drawNode(node) {
        const radius = node.radius || this.nodeRadius;
        
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetY = 4;
        
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        
        if (node.type === 'terminal') {
            this.ctx.fillStyle = '#f8f9fa';
        } else {
            const playerColors = ['#4cc9f0', '#4895ef', '#4361ee', '#3a0ca3'];
            this.ctx.fillStyle = playerColors[node.player || 0] || '#4361ee';
        }
        
        this.ctx.fill();
        
        this.ctx.strokeStyle = node.id === this.selectedNode?.id ? '#f72585' : '#2b2d42';
        this.ctx.lineWidth = node.id === this.selectedNode?.id ? 3 : 2;
        this.ctx.stroke();
        
        this.ctx.shadowColor = 'transparent';
        
        this.ctx.fillStyle = '#2b2d42';
        this.ctx.textAlign = 'center';
        
        if (node.type === 'terminal') {
            const payoffText = node.payoffs.map(p => p.toFixed(1)).join(', ');
            this.ctx.font = `${Math.max(10, radius / 2)}px Inter`;
            this.ctx.fillText(payoffText, node.x, node.y + 5);
        } else if (node.type === 'player') {
            const playerName = this.gameTree.playerNames[node.player || 0] || `Гравець ${(node.player || 0) + 1}`;
            this.ctx.font = `${Math.max(12, radius / 2)}px Inter`;
            this.ctx.fillText(playerName, node.x, node.y - 5);
            
            if (node.strategy) {
                this.ctx.font = `${Math.max(10, radius / 2.5)}px Inter`;
                this.ctx.fillText(node.strategy, node.x, node.y + 15);
            }
        }
        
        this.ctx.font = 'bold 12px Inter';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#2b2d42';
        
        this.ctx.beginPath();
        this.ctx.arc(node.x - radius + 15, node.y - radius + 15, 10, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fill();
        this.ctx.strokeStyle = '#2b2d42';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        this.ctx.fillStyle = '#2b2d42';
        this.ctx.fillText(`#${node.id}`, node.x - radius + 15, node.y - radius + 18);
    }

    highlightSolution(solution) {
        if (!solution) return;
        
        this.render();
        
        const highlightPath = (nodeId) => {
            const node = this.gameTree.getNode(nodeId);
            if (!node) return;
            
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
                
                // Highlight alternative paths if they exist
                if (solution.alternativeStrategies && solution.alternativeStrategies[nodeId]) {
                    solution.alternativeStrategies[nodeId].forEach(action => {
                        const altEdge = this.gameTree.edges.find(edge => 
                            edge.from === nodeId && 
                            this.gameTree.getNode(edge.to).action === action
                        );
                        
                        if (altEdge) {
                            const altNode = this.gameTree.getNode(altEdge.to);
                            
                            this.ctx.beginPath();
                            this.ctx.moveTo(node.x, node.y + this.nodeRadius);
                            this.ctx.lineTo(altNode.x, altNode.y - this.nodeRadius);
                            this.ctx.strokeStyle = 'rgba(76, 201, 240, 0.5)';
                            this.ctx.lineWidth = 2;
                            this.ctx.setLineDash([5, 5]);
                            this.ctx.stroke();
                            this.ctx.setLineDash([]);
                        }
                    });
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