// not minimized on purpose

const SIDE_LENGTH_LS_KEY = 'side-length';
const MINES_LS_KEY = 'mines';
const MIN_SIDE_LENGTH = 2;
const MAX_SIDE_LENGTH = 30;
const ADJUSTMENTS = [-1, 0, 1];
const NEIGHBOR_ADJUSTMENTS = ADJUSTMENTS.flatMap(x =>
    ADJUSTMENTS.map(y => [x, y]).filter(coords => coords.some(Boolean))
);
const MARKED_AS_MINE_CLS = 'mine';
const CELL_CLS = 'cell';
const REVEALED_CLS = 'revealed';

const fieldEl = document.getElementById('field');
const totalEmptyCellsCountEl = document.getElementById('total');
const revealedCellsCountEl = document.getElementById('revealed-count');
const sideLengthEl = document.getElementById('side');
const minesCountEl = document.getElementById('mines');

const handleEnter = e => {
    if (e.key !== 'Enter') return;
    e.target.blur();
    return false;
};

const getCellPositionData = cell => {
    const { rowI: rowIString, cellI: cellIString } = cell?.dataset ?? {};
    if (rowIString === undefined || cellIString === undefined)
        throw new Error('Failed to get coordinates');
    return { rowI: +rowIString, cellI: +cellIString };
};

const renderField = field => {
    fieldEl.innerHTML = '';
    const rows = field.map((cells, rowI) => {
        const row = document.createElement('div');
        row.className = 'row';
        cells.map((_, cellI) => {
            const cell = document.createElement('span');
            cell.className = CELL_CLS;
            cell.dataset.rowI = rowI;
            cell.dataset.cellI = cellI;
            row.append(cell);
        });
        return row;
    });
    fieldEl.append(...rows);
};

const main = () => {
    let gameStarted = false;
    const sideLength = +(localStorage.getItem(SIDE_LENGTH_LS_KEY) ?? 10);
    const minesCount = +(localStorage.getItem(MINES_LS_KEY) ?? 10);
    sideLengthEl.innerHTML = sideLength;
    minesCountEl.innerHTML = minesCount;
    revealedCellsCountEl.innerHTML = 0;
    totalEmptyCellsCountEl.innerHTML = sideLength ** 2 - minesCount;

    // EDITABLE FIELDS EVENT HANDLERS
    sideLengthEl.onkeydown = handleEnter;
    minesCountEl.onkeydown = handleEnter;

    sideLengthEl.onblur = evt => {
        const value = Math.max(
            MIN_SIDE_LENGTH,
            Math.min(MAX_SIDE_LENGTH, +evt.target.innerText)
        );
        if (Number.isNaN(value)) {
            sideLengthEl.innerHTML = sideLength;
            return;
        }
        localStorage.setItem(SIDE_LENGTH_LS_KEY, value);

        // ensure we're under mines minimum for the side length
        const allowedMinesCount = Math.min(minesCount, value ** 2 - 2);
        minesCountEl.innerHTML = allowedMinesCount;
        localStorage.setItem(MINES_LS_KEY, allowedMinesCount);
        main(); // restart
    };

    minesCountEl.onblur = evt => {
        const value = +evt.target.innerText;
        if (Number.isNaN(value)) {
            minesCountEl.innerHTML = minesCount;
            return;
        }
        localStorage.setItem(
            MINES_LS_KEY,
            Math.max(1, Math.min(sideLength ** 2 - 2, value))
        );
        main(); // restart
    };

    // GAME LOGIC
    const field = Array.from({ length: sideLength }).map(() =>
        Array(sideLength).fill(0)
    );

    const visibility = Array.from({ length: sideLength }).map(() =>
        Array(sideLength).fill(false)
    );

    const getCellElements = () => {
        const cellsArr = Array.from(document.getElementsByClassName(CELL_CLS));
        const rows = [];
        for (let i = 0; i < cellsArr.length; i += sideLength) {
            rows.push(cellsArr.slice(i, i + sideLength));
        }
        return rows;
    };

    const updateVisibleCount = () => {
        let visibleCount = 0;
        for (const row of visibility) {
            for (const isCellVisible of row) {
                if (isCellVisible) visibleCount++;
            }
        }
        revealedCellsCountEl.innerHTML = visibleCount;
        if (visibleCount === sideLength ** 2 - minesCount) {
            // allow time to update html
            setTimeout(() => endGame(true), 0);
        }
    };

    const loseGame = () => {
        // show all locations for all mines
        const cells = getCellElements();
        cells.forEach((row, rowI) =>
            row.forEach((cell, cellI) => {
                if (field[rowI][cellI] === '*') {
                    cell.classList.add(MARKED_AS_MINE_CLS);
                } else {
                    cell.classList.remove(MARKED_AS_MINE_CLS);
                }
            })
        );
        // allow time to update html
        setTimeout(() => endGame(false), 0);
    };

    const endGame = hasWon => {
        fieldEl.onclick = null;
        fieldEl.oncontextmenu = e => e.preventDefault();
        const rematchRequested = confirm(
            `Game over! You ${hasWon ? 'won' : 'lost'}.\n\nPlay again?`
        );
        if (rematchRequested) main();
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
            const cells = getCellElements();
            for (const [rowAdj, cellAdj] of NEIGHBOR_ADJUSTMENTS) {
                const rI = rowI + rowAdj;
                const cI = cellI + cellAdj;
                if (cells[rI]?.[cI]?.classList.contains(MARKED_AS_MINE_CLS))
                    value--;
            }
            if (value > 0) return; // not enough cells marked as mines to reveal
            revealAdjacents({ rowI, cellI });
            updateVisibleCount();
        } else {
            target.classList.toggle(MARKED_AS_MINE_CLS);
        }
    };

    const revealAdjacents = ({ rowI, cellI }) => {
        const cells = getCellElements();
        for (const [rowAdj, cellAdj] of NEIGHBOR_ADJUSTMENTS) {
            const rI = rowI + rowAdj;
            const cI = cellI + cellAdj;
            const isVisible = visibility[rI]?.[cI];

            if (isVisible) continue; // no need to reveal
            const value = field[rI]?.[cI];
            const cell = cells[rI]?.[cI];
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
        const shuffledCells = Array.from({ length: sideLength ** 2 })
            .map((_, i) => ({ value: i, weight: Math.random() }))
            .sort((a, b) => a.weight - b.weight)
            .map(({ value }) => ({
                rowI: Math.floor(value / sideLength),
                cellI: value % sideLength
            }))
            .filter(
                // first clicked cell should always be safe
                ({ rowI, cellI }) =>
                    rowI !== initialRow || cellI !== initialCell
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

    renderField(field);
};

main();
