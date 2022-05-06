const main = () => {
    let gameStarted = false;
    const neighborAdjustments = [
        [-1, -1],
        [-1, 0],
        [-1, 1],
        [0, -1],
        [0, 1],
        [1, -1],
        [1, 0],
        [1, 1]
    ];
    const fieldEl = document.getElementById('field');
    const sideLengthEl = document.getElementById('side');
    const minesCountEl = document.getElementById('mines');
    const revealedCellsCountEl = document.getElementById('revealed');
    const totalEmptyCellsCountEl = document.getElementById('total');

    const sideLength = +(localStorage.getItem('side-length') ?? 10);
    const minesCount = +(localStorage.getItem('mines') ?? 10);

    sideLengthEl.innerHTML = sideLength;
    minesCountEl.innerHTML = minesCount;
    revealedCellsCountEl.innerHTML = 0;
    totalEmptyCellsCountEl.innerHTML = sideLength ** 2 - minesCount;

    const getCellElements = () => {
        const cellsArr = Array.from(document.getElementsByClassName('cell'));
        const rows = [];
        for (let i = 0; i < cellsArr.length; i += sideLength) {
            rows.push(cellsArr.slice(i, i + sideLength));
        }
        return rows;
    };

    const renderField = field => {
        const fieldHTML = field
            .map(
                (arr, rowI) => `<div class="row">
                ${arr
                    .map(
                        (val, cellI) =>
                            `<span
    data-row-i=${rowI}
    data-cell-i=${cellI}
    class="cell ${visibility[rowI][cellI] ? 'revealed' : ''}"
>${visibility[rowI][cellI] ? val || '' : ''}</span>`
                    )
                    .join('')}
            </div>`
            )
            .join('');
        fieldEl.innerHTML = fieldHTML;
    };

    // handle initial values change
    const minSideLength = 2;
    const maxSideLength = 30;
    sideLengthEl.onblur = evt => {
        const value = +evt.target.innerText;
        if (
            Number.isNaN(value) ||
            value < minSideLength ||
            value > maxSideLength
        ) {
            sideLengthEl.innerHTML = sideLength;
            return;
        }
        const allowedMinesCount = Math.min(
            minesCount,
            (+evt.target.innerText) ** 2 - 1
        );
        minesCountEl.innerHTML = allowedMinesCount;
        localStorage.setItem('side-length', value);
        localStorage.setItem('mines', allowedMinesCount);
        main();
    };

    minesCountEl.onblur = evt => {
        const value = +evt.target.innerText;
        if (Number.isNaN(value) || value < 0 || value > sideLength ** 2 - 1) {
            minesCountEl.innerHTML = minesCount;
            return;
        }
        localStorage.setItem('mines', value);
        main();
    };

    const field = Array.from({ length: sideLength }).map(() =>
        Array(sideLength).fill(0)
    );

    const visibility = Array.from({ length: sideLength }).map(() =>
        Array(sideLength).fill(false)
    );

    const checkWinCondition = () => {
        const visibleCount = visibility.reduce(
            (acc, row) =>
                acc + row.reduce((acc, val) => acc + (val ? 1 : 0), 0),
            0
        );
        revealedCellsCountEl.innerHTML = visibleCount;
        if (visibleCount === sideLength ** 2 - minesCount) {
            setTimeout(() => endGame(true), 0);
        }
    };

    const loseGame = () => {
        // show all mines' locations
        const cells = getCellElements();
        cells.forEach((row, rowI) =>
            row.forEach((cell, cellI) => {
                if (field[rowI][cellI] === '*') {
                    cell.classList.add('mine');
                } else {
                    cell.classList.remove('mine');
                }
            })
        );
        setTimeout(() => endGame(false), 0);
    };

    const endGame = hasWon => {
        fieldEl.onclick = null;
        field.oncontextmenu = null;
        if (
            confirm(`Game over! You ${hasWon ? 'won' : 'lost'}.\n\nPlay again?`)
        )
            main();
    };

    const getCellPositionData = cell => {
        const { rowI: rowIString, cellI: cellIString } = cell.dataset;
        if (rowIString === undefined || cellIString === undefined) return;
        return { rowI: +rowIString, cellI: +cellIString };
    };

    fieldEl.onclick = evt => {
        if (evt.target.classList.contains('mine')) return;
        const data = getCellPositionData(evt.target);
        if (!data) return;
        const { rowI, cellI } = data;
        if (!gameStarted) {
            // only place mines after the first click so no one loses on their first move
            placeMines([rowI, cellI]);
            gameStarted = true;
        }
        visibility[rowI][cellI] = true;
        evt.target.classList.add('revealed');
        const value = field[rowI][cellI];
        evt.target.innerHTML = value || '';
        if (value === '*') {
            loseGame();
            return;
        }
        if (value === 0) revealAdjacents({ rowI, cellI }, true);
        checkWinCondition();
    };

    fieldEl.oncontextmenu = evt => {
        evt.preventDefault();
        const isVisible = evt.target.classList.contains('revealed');
        if (isVisible) {
            const data = getCellPositionData(evt.target);
            if (!data) return;
            const { rowI, cellI } = data;
            const cells = getCellElements();
            let value = field[rowI][cellI];
            for (const [rowAdj, cellAdj] of neighborAdjustments) {
                const rI = rowI + rowAdj;
                const cI = cellI + cellAdj;
                if (cells[rI]?.[cI]?.classList.contains('mine')) value--;
            }
            if (value > 0) return;
            revealAdjacents({ rowI, cellI }, false);
            checkWinCondition();
        } else {
            evt.target.classList.toggle('mine');
        }
    };

    const revealAdjacents = ({ rowI, cellI }, onlyNumbers) => {
        const cells = getCellElements();
        for (const [rowAdj, cellAdj] of neighborAdjustments) {
            const rI = rowI + rowAdj;
            const cI = cellI + cellAdj;
            const isVisible = visibility[rI]?.[cI];

            if (isVisible) continue;
            const value = field[rI]?.[cI];
            if (cells[rI]?.[cI]?.classList.contains('mine')) continue;
            if (typeof value !== 'number' && onlyNumbers) continue;
            if (value === undefined) continue;
            if (value === '*') {
                loseGame();
                continue;
            }
            visibility[rI][cI] = true;

            const cell = cells[rI][cI];
            cell.classList.add('revealed');
            cell.innerHTML = value || '';
            if (value === 0) {
                revealAdjacents({ rowI: rI, cellI: cI }, true);
            }
        }
    };

    const placeMines = ([initialRow, initialCell]) => {
        const shuffled = Array.from({ length: sideLength ** 2 })
            .map((_, i) => ({ value: i, weight: Math.random() }))
            .sort((a, b) => a.weight - b.weight)
            .map(({ value }) => ({
                rowI: Math.floor(value / sideLength),
                cellI: value % sideLength
            }))
            .filter(
                ({ rowI, cellI }) =>
                    rowI !== initialRow || cellI !== initialCell
            );
        let minesLeft = minesCount;
        while (minesLeft--) {
            const { rowI, cellI } = shuffled.pop();
            placeMine(field, rowI, cellI);
        }
    };

    const placeMine = (field, rowI, cellI) => {
        field[rowI][cellI] = '*';
        for (const [rowAdj, cellAdj] of neighborAdjustments) {
            if (typeof field[rowI + rowAdj]?.[cellI + cellAdj] === 'number') {
                field[rowI + rowAdj][cellI + cellAdj]++;
            }
        }
    };

    renderField(field);
};

main();
