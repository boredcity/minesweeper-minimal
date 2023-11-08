import { animateStringChange } from './string-change-animation.mjs';
const initialTitle = document.title;
const root = document.getElementById('root');

let wasWideScreen = null;

const loadContent = async () => {
    const isWideScreen = window.innerWidth >= 600;

    if (wasWideScreen === isWideScreen) return;
    wasWideScreen = isWideScreen;

    root.innerHTML = '';

    if (isWideScreen) {
        animateStringChange(initialTitle, 5, str => (document.title = str));
        const { startGames } = await import('./minesweeper.mjs');
        startGames(root);
    } else {
        const title = document.createElement('h1');
        root.append(title);
        animateStringChange(
            initialTitle,
            Infinity,
            str => (title.innerHTML = str)
        );
    }
};

window.onresize = loadContent;

loadContent();
