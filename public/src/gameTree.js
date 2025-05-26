export class GameTree {
    constructor() {
        this.root = null;
        this.nodes = [];
        this.edges = [];
        this.nextNodeId = 1;
        this.playerCount = 2;
        this.playerNames = ['Player 1', 'Player 2'];
        this.solutionSteps = [];
    }

    addNode(type, parentId = null, action = null) {
        const id = this.nextNodeId++;
        const node = { id, type, children: [], parent: parentId, action };
        
        if (type === 'player') {
            node.player = 0;
            node.strategy = '';
        } else if (type === 'terminal') {
            node.payoffs = Array(this.playerCount).fill(0);
        }
        
        this.nodes.push(node);
        
        if (parentId !== null) {
            const parent = this.getNode(parentId);
            if (parent) {
                parent.children.push(id);
                this.edges.push({ from: parentId, to: id, action: action || `Action ${parent.children.length}` });
            }
        } else if (this.root === null) {
            this.root = id;
        }
        
        return node;
    }

    getNode(id) {
        return this.nodes.find(node => node.id === id);
    }

    updateNode(id, properties) {
        const node = this.getNode(id);
        if (node) {
            Object.assign(node, properties);
        }
    }

    deleteNode(id) {
        const node = this.getNode(id);
        if (!node) return;

        if (node.parent !== null) {
            const parent = this.getNode(node.parent);
            if (parent) {
                parent.children = parent.children.filter(childId => childId !== id);
            }
        }

        node.children.forEach(childId => this.deleteNode(childId));
        this.nodes = this.nodes.filter(n => n.id !== id);
        this.edges = this.edges.filter(edge => edge.from !== id && edge.to !== id);

        if (this.root === id) {
            this.root = null;
        }
    }

    setPlayerCount(count) {
        this.playerCount = count;
        this.nodes.forEach(node => {
            if (node.type === 'terminal') {
                if (node.payoffs.length < count) {
                    while (node.payoffs.length < count) {
                        node.payoffs.push(0);
                    }
                } else if (node.payoffs.length > count) {
                    node.payoffs = node.payoffs.slice(0, count);
                }
            }
        });
    }

    setPlayerNames(names) {
        this.playerNames = names.slice(0, this.playerCount);
    }

    solve() {
        this.solutionSteps = [];
        if (!this.root) return null;

        const solution = {
            strategies: {},
            expectedPayoffs: Array(this.playerCount).fill(0),
            steps: []
        };

        const solveRecursive = (nodeId, path = []) => {
            const node = this.getNode(nodeId);
            const currentPath = [...path, nodeId];
            
            if (node.type === 'terminal') {
                this.solutionSteps.push({
                    description: `Terminal node ${nodeId} reached with payoffs: [${node.payoffs.join(', ')}]`,
                    path: [...currentPath],
                    payoffs: node.payoffs
                });
                return { 
                    payoffs: node.payoffs,
                    strategy: null
                };
            }
            
            const childResults = node.children.map(childId => {
                const result = solveRecursive(childId, currentPath);
                return {
                    id: childId,
                    ...result
                };
            });
            
            if (node.type === 'player') {
                const currentPlayer = node.player;
                let bestPayoff = -Infinity;
                let bestChildIndex = 0;
                let bestActions = [];
                
                for (let i = 0; i < childResults.length; i++) {
                    if (childResults[i].payoffs[currentPlayer] > bestPayoff) {
                        bestPayoff = childResults[i].payoffs[currentPlayer];
                        bestChildIndex = i;
                        bestActions = [i];
                    } else if (childResults[i].payoffs[currentPlayer] === bestPayoff) {
                        bestActions.push(i);
                    }
                }
                
                const bestChildId = node.children[bestChildIndex];
                const bestChild = this.getNode(bestChildId);
                const actionName = bestChild.action || `Action ${bestChildIndex + 1}`;
                solution.strategies[nodeId] = actionName;
                
                this.solutionSteps.push({
                    description: `Player ${this.playerNames[currentPlayer]} chooses ${actionName} at node ${nodeId}`,
                    path: [...currentPath],
                    payoffs: childResults[bestChildIndex].payoffs,
                    player: currentPlayer,
                    chosenAction: actionName,
                    alternativeActions: bestActions.length > 1 ? 
                        bestActions.map(i => {
                            const child = this.getNode(node.children[i]);
                            return child.action || `Action ${i + 1}`;
                        }) : null
                });
                
                return {
                    payoffs: childResults[bestChildIndex].payoffs,
                    strategy: bestChildId
                };
            }
        };
        
        const rootResult = solveRecursive(this.root);
        solution.expectedPayoffs = rootResult.payoffs;
        solution.steps = this.solutionSteps;
        
        return solution;
    }

    toJSON() {
        return {
            root: this.root,
            nodes: this.nodes,
            edges: this.edges,
            playerCount: this.playerCount,
            playerNames: this.playerNames
        };
    }

    loadFromJSON(data) {
        this.root = data.root;
        this.nodes = data.nodes;
        this.edges = data.edges;
        this.playerCount = data.playerCount;
        this.playerNames = data.playerNames || Array(this.playerCount).map((_, i) => `Player ${i + 1}`);
        this.nextNodeId = Math.max(...this.nodes.map(n => n.id), 0) + 1;
    }
}