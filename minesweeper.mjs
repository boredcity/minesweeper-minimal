// not minimized on purpose

import { letterMaps } from './maps.mjs';

const ADJUSTMENTS = [-1, 0, 1];
const NEIGHBOR_ADJUSTMENTS = ADJUSTMENTS.flatMap(x =>
    ADJUSTMENTS.map(y => [x, y]).filter(coords => coords.some(Boolean))
);
const MARKED_AS_MINE_CLS = 'mine';
const CELL_CLS = 'cell';
const REVEALED_CLS = 'revealed';

export const startGames = rootElement =>
    letterMaps
        .flatMap(word => {
            const sectionEl = document.createElement('section');
            sectionEl.className = 'word';
            const mapInfo = word.map(letter => {
                const fieldEl = document.createElement('div');
                fieldEl.className = 'letter-map';
                sectionEl.append(fieldEl);
                return { fieldShape: letter, fieldEl };
            });
            rootElement.append(sectionEl);
            return mapInfo;
        })
        .map(runGame);

const getCellPositionData = cell => {
    const { rowI, cellI } = cell.dataset;
    return { rowI: +rowI, cellI: +cellI };
};

const getCell = (fieldEl, rowI, cellI) =>
    fieldEl.querySelector(
        `.cell[data-row-i="${rowI}"][data-cell-i="${cellI}"]`
    ) ?? undefined;

let shouldAutoSolve = true;

function runGame({ fieldShape, fieldEl }, gameIndex) {
    fieldEl.classList.remove('won');
    fieldEl.classList.remove('lost');
    const field = fieldShape.map(row => row.slice());
    let gameStarted = false;
    let gameFinished = false;

    if (fieldEl.innerHTML === '') {
        fieldEl.style.gridTemplateColumns = `repeat(${field[0].length}, 1fr)`;
        const cellEls = field.flatMap((cells, rowI) => {
            return cells.map((val, cellI) => {
                const cell = document.createElement('span');
                if (val === null) return undefined;
                cell.className = CELL_CLS;
                cell.dataset.rowI = rowI;
                cell.dataset.cellI = cellI;
                cell.style.gridArea = `${rowI + 1} / ${cellI + 1}`;
                return cell;
            });
        });
        fieldEl.append(...cellEls.filter(Boolean));
    } else {
        Array.from(fieldEl.getElementsByClassName(CELL_CLS)).forEach(c => {
            c.className = 'cell';
            c.innerHTML = '';
        });
    }

    if (localStorage.wonStages?.includes(`|${gameIndex}|`)) {
        return fieldEl.classList.add('won');
    }

    const cellsArr = Array.from(fieldEl.getElementsByClassName(CELL_CLS));

    const visibility = field.map(row => row.map(() => false));

    // each next letter is a bit more challenging
    const minesCount = Math.floor(cellsArr.length / (16 - gameIndex));

    const checkWinCondition = () => {
        let visibleCount = 0;
        for (const row of visibility) {
            for (const isCellVisible of row) {
                if (isCellVisible) visibleCount++;
            }
        }
        if (visibleCount === cellsArr.length - minesCount) {
            // allow time to update html
            setTimeout(() => endGame(true), 0);
        }
    };

    const loseGame = () => {
        // show all locations for all mines
        cellsArr.forEach(cell => {
            const { rowI, cellI } = getCellPositionData(cell);
            if (field[rowI][cellI] === '*') {
                cell.classList.add(MARKED_AS_MINE_CLS);
            } else {
                cell.classList.remove(MARKED_AS_MINE_CLS);
            }
        });
        // allow time to update html
        setTimeout(() => endGame(false), 0);
    };

    const endGame = hasWon => {
        gameFinished = true;
        fieldEl.onclick = null;
        fieldEl.oncontextmenu = e => e.preventDefault();
        if (hasWon) {
            fieldEl.classList.add('won');
            if (!shouldAutoSolve) {
                if (localStorage.wonStages === undefined)
                    localStorage.wonStages = '';
                localStorage.wonStages += `|${gameIndex}|`;
                return;
            }
        } else {
            fieldEl.classList.add('lost');
        }
        setTimeout(() => {
            runGame({ fieldShape, fieldEl }, gameIndex);
        }, 1000);
    };

    const revealCell = (target, delay = 0) => {
        if (!target.classList.contains(CELL_CLS)) return;
        if (target.classList.contains(MARKED_AS_MINE_CLS)) return; // ignore marked as mines
        const { rowI, cellI } = getCellPositionData(target);
        if (visibility[rowI][cellI]) return;
        if (!gameStarted) {
            // place mines on first click of the game
            placeMines([rowI, cellI]);
            gameStarted = true;
        }
        visibility[rowI][cellI] = true;
        const value = field[rowI][cellI];
        setTimeout(() => {
            if (gameFinished) return;
            target.classList.add(REVEALED_CLS);
            target.innerHTML = value || '';
        }, delay);
        setTimeout(() => {
            if (value === 0) revealAdjacents({ rowI, cellI }, delay + 10);
            checkWinCondition();
        }, 0);
        if (value === '*') loseGame();
    };

    fieldEl.onclick = evt => {
        shouldAutoSolve = false;
        revealCell(evt.target);
    };

    const revealAdjacents = async ({ rowI, cellI }, delay = 0) => {
        for (const [rowAdj, cellAdj] of NEIGHBOR_ADJUSTMENTS) {
            const cell = getCell(fieldEl, rowI + rowAdj, cellI + cellAdj);
            if (cell) revealCell(cell, delay);
        }
    };

    fieldEl.oncontextmenu = evt => {
        shouldAutoSolve = false;
        evt.preventDefault();
        const { target } = evt;
        if (!target.classList.contains(CELL_CLS)) return;
        const { rowI, cellI } = getCellPositionData(target);
        if (visibility[rowI][cellI]) {
            // reveal adjacent cells if enough neighbours are marked as mines
            const { rowI, cellI } = getCellPositionData(target);
            let value = field[rowI][cellI];
            if (value === 0) return; // adjacents already should be revealed
            for (const [rowAdj, cellAdj] of NEIGHBOR_ADJUSTMENTS) {
                const cell = getCell(fieldEl, rowI + rowAdj, cellI + cellAdj);
                if (cell?.classList.contains(MARKED_AS_MINE_CLS)) value--;
            }
            if (value > 0) return; // not enough cells marked as mines to reveal
            revealAdjacents({ rowI, cellI });
            checkWinCondition();
        } else {
            target.classList.toggle(MARKED_AS_MINE_CLS);
        }
    };

    const placeMines = ([initialRow, initialCell]) => {
        const shuffledCells = cellsArr
            .map(cell => ({ cell, weight: Math.random() }))
            .sort((a, b) => a.weight - b.weight)
            .map(({ cell }) => getCellPositionData(cell))
            .filter(
                ({ rowI, cellI }) =>
                    field[rowI][cellI] !== null &&
                    // first clicked cell should always be safe
                    (rowI !== initialRow || cellI !== initialCell)
            );
        let minesLeft = minesCount;
        while (minesLeft--) {
            const { rowI, cellI } = shuffledCells.pop();
            placeMine(field, rowI, cellI);
        }
    };

    const placeMine = (field, rowI, cellI) => {
        field[rowI][cellI] = '*';
        // update neighbours info
        for (const [rowAdj, cellAdj] of NEIGHBOR_ADJUSTMENTS) {
            if (typeof field[rowI + rowAdj]?.[cellI + cellAdj] === 'number') {
                // not a mine or outside field
                field[rowI + rowAdj][cellI + cellAdj]++;
            }
        }
    };

    async function autoSolve() {
        let lastRevealedCell = null;
        while (shouldAutoSolve && !gameFinished) {
            if (lastRevealedCell) {
                const { rowI, cellI } = getCellPositionData(lastRevealedCell);
                const minesAround = field[rowI][cellI];
                const potentialMines = [];
                for (const [rowAdj, cellAdj] of NEIGHBOR_ADJUSTMENTS) {
                    const neighbourRowI = rowI + rowAdj;
                    const neighbourCellI = cellI + cellAdj;
                    const cell = getCell(
                        fieldEl,
                        neighbourRowI,
                        neighbourCellI
                    );
                    if (cell) {
                        const alreadyRevealed =
                            visibility[neighbourRowI][neighbourCellI];
                        if (!alreadyRevealed) potentialMines.push(cell);
                    }
                }
                if (potentialMines.length === minesAround) {
                    for (const cell of potentialMines) {
                        cell.classList.add(MARKED_AS_MINE_CLS);
                        await new Promise(res =>
                            setTimeout(
                                res,
                                Math.max(350, Math.floor(Math.random() * 1000))
                            )
                        );
                    }
                }
                lastRevealedCell = null;
                continue;
            } else {
                const safeChoices = cellsArr.filter(c => {
                    const { rowI, cellI } = getCellPositionData(c);
                    if (visibility[rowI][cellI]) return false;
                    const value = field[rowI][cellI];
                    if (value === '*' || null) {
                        return false;
                    }
                    return true;
                });

                if (safeChoices.length === 0) {
                    return;
                }
                const cellToReveal =
                    safeChoices[Math.floor(Math.random() * safeChoices.length)];
                revealCell(cellToReveal);
                lastRevealedCell = cellToReveal;
            }

            await new Promise(res =>
                setTimeout(res, Math.max(750, Math.floor(Math.random() * 1500)))
            );
        }
        if (!gameFinished) {
            endGame(false);
        }
    }

    if (shouldAutoSolve)
        setTimeout(autoSolve, Math.max(1500, Math.floor(Math.random() * 3500)));
}