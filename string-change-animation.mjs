const charOptions = {
    b: ['b', 'Ƅ', 'ᑲ', 'ᖯ', '𝐛', '𝑏', '𝒃', '𝔟', '𝕓', '𝖇', '𝖻', '𝗯', '𝘣', '𝚋'],
    o: ['o', '⍥', '∅', 'ο', 'σ', '𝟶', '𑣈', 'ჿ'],
    r: ['r', 'ⲅ', '𝐫', '𝑟', '𝒓', '𝓇', '𝕣', '𝗋', '𝗿', '𝚛'],
    e: ['e', 'ẹ', 'е', 'ҽ', '℮', 'ℯ'],
    d: ['d', 'ԁ', 'ᑯ', 'ⅾ', '𝐝', '𝑑', '𝒅', '𝕕', '𝖽', '𝗱', '𝘥', '𝙙', '𝚍'],
    c: ['c', 'ⅽ', 'ⲥ', 'ꮯ', '𐐽', '𝐜', '𝑐', '𝒄', '𝕔', '𝖈', '𝗰', '𝘤', '𝙘', '𝚌'],
    i: ['i', 'í', 'ĭ', 'ǐ'],
    t: ['t', '𝕥', '𝐭', '𝑡', '𝒕', '𝔱', '𝖙', '𝗍', '𝘁', '𝘵', '𝙩', '𝚝'],
    y: ['y', 'γ', 'ү', 'ỿ', '𝐲', '𝑦', '𝒚', '𝓎', '𝔂', '𝕪', '𝘺', '𝚢', '𝛾', '𝞬']
};

const getRandomStringChar = str => str[Math.floor(Math.random() * str.length)];

const getStringOption = str => {
    return [...str]
        .map(char => getRandomStringChar(charOptions[char] ?? char))
        .join('');
};

export const animateStringChange = async (
    originalString,
    iterationsNumber,
    cb
) => {
    --iterationsNumber;
    if (iterationsNumber === 0) {
        cb(originalString);
        return;
    }
    cb(getStringOption(originalString));
    setTimeout(
        () => animateStringChange(originalString, iterationsNumber, cb),
        200
    );
};
