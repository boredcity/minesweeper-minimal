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

function runGame({ fieldShape, fieldEl }, gameIndex) {
    fieldEl.classList.remove('lost');
    const field = fieldShape.map(row => row.slice());
    let gameStarted = false;

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
    const cellsArr = Array.from(fieldEl.getElementsByClassName(CELL_CLS));

    const visibility = field.map(row => row.map(() => false));

    // each next letter is a bit more challenging
    const minesCount = Math.floor(cellsArr.length / (16 - gameIndex));

    const updateVisibleCount = () => {
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
        fieldEl.onclick = null;
        fieldEl.oncontextmenu = e => e.preventDefault();
        if (hasWon) {
            fieldEl.classList.add('won');
        } else {
            fieldEl.classList.add('lost');
            setTimeout(() => {
                runGame({ fieldShape, fieldEl }, gameIndex);
            }, 1000);
        }
    };

    fieldEl.onclick = ({ target }) => {
        if (!target.classList.contains(CELL_CLS)) return;
        if (target.classList.contains(MARKED_AS_MINE_CLS)) return; // ignore marked as mines
        const { rowI, cellI } = getCellPositionData(target);
        if (!gameStarted) {
            // place mines on first click of the game
            placeMines([rowI, cellI]);
            gameStarted = true;
        }
        visibility[rowI][cellI] = true;
        target.classList.add(REVEALED_CLS);
        const value = field[rowI][cellI];
        target.innerHTML = value || '';
        if (value === '*') {
            loseGame();
            return;
        }
        if (value === 0) revealAdjacents({ rowI, cellI });
        updateVisibleCount();
    };

    fieldEl.oncontextmenu = evt => {
        evt.preventDefault();
        const { target } = evt;
        if (!target.classList.contains(CELL_CLS)) return;
        const isRevealed = target.classList.contains(REVEALED_CLS);
        if (isRevealed) {
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
            updateVisibleCount();
        } else {
            target.classList.toggle(MARKED_AS_MINE_CLS);
        }
    };

    const revealAdjacents = ({ rowI, cellI }) => {
        for (const [rowAdj, cellAdj] of NEIGHBOR_ADJUSTMENTS) {
            const rI = rowI + rowAdj;
            const cI = cellI + cellAdj;
            const isVisible = visibility[rI]?.[cI];
            if (isVisible) continue; // no need to reveal

            const value = field[rI]?.[cI];
            const cell = getCell(fieldEl, rI, cI);
            if (cell === undefined || value === undefined) continue; // skip out of bounds

            if (cell.classList.contains(MARKED_AS_MINE_CLS)) continue; // skip cells marked by player as mines
            if (value === '*') {
                // Game over: revealed an unmarked mine
                loseGame();
                continue;
            }
            visibility[rI][cI] = true;

            cell.classList.add(REVEALED_CLS);
            cell.innerHTML = value || '';
            if (value === 0) revealAdjacents({ rowI: rI, cellI: cI });
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
}
