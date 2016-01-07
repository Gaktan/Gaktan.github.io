var reader;
var progress;

var wordMap;
var topTen;

function makeFun(firstWord, total) {

	if (wordMap == undefined) {
		return "You need to upload a file first.";
	}
	if (firstWord == undefined) {
		return "You must select a word to start with.";
	}
	if (total == undefined || total < 1) {
		total = 1;
	}

    var word = wordMap[firstWord];
	
	if (word == undefined) {
		return "Could not find the word \"" + firstWord + "\".";
	}
	
	var totalResult = "";

	var count = 0;
    while (count < total) {
        count++;
		
        var sentence = word.makeRandomSentence();

        if (sentence.length == 0)
            continue;

        sentence = sentence.replace(sentence[0], sentence[0].toUpperCase());
		sentence = sentence.replace(" , ", ", ");
        sentence += ".\n";

		totalResult += sentence;
    }
	
	return totalResult;
}

function disableInput(bool) {
	document.getElementById('customField').disabled = bool;
};

function errorHandler(evt) {
    switch (evt.target.error.name) {
        case evt.target.error.NOT_FOUND_ERR:
            alert('File Not Found!');
            break;
        case evt.target.error.NOT_READABLE_ERR:
            alert('File is not readable');
            break;
        case evt.target.error.ABORT_ERR:
            break; // noop
        default:
            alert('An error occurred reading this file.');
    };
}

function updateProgress(evt) {
    // evt is an ProgressEvent.
    if (evt.lengthComputable) {
        var percentLoaded = Math.round((evt.loaded / evt.total) * 100);
        // Increase the progress bar length.
        if (percentLoaded < 100) {
            progress.style.width = percentLoaded + '%';
            progress.textContent = percentLoaded + '%';
        }
    }
}

function handleFileSelect(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    // Reset progress indicator on new file selection.
    progress.style.width = '0%';
    progress.textContent = '0%';

    reader = new FileReader();
    reader.onerror = errorHandler;
    reader.onprogress = updateProgress;
    reader.onabort = function(e) {
        alert('File read cancelled');
    };
    reader.onloadstart = function(e) {
        document.getElementById('progress_bar').className = 'loading';
    };
    reader.onload = function(e) {
        // Ensure that the progress bar displays 100% at the end.
        progress.style.width = '100%';
        progress.textContent = '100%';
        //setTimeout("document.getElementById('progress_bar').className='';", 2000);

        if (e.target.readyState == FileReader.DONE) { // DONE == 2
			var result = processText(e.target.result);
			wordMap = result.wordMap;
			topTen = result.topTen;
			
			var text = "";
		
			
			for (var top in topTen) {
				var value = topTen[top];
				var name = value.replace(value[0], value[0].toUpperCase());
				text += '<input type="radio" name="topTen" value="' + value + '" id="' + value + '" onClick="disableInput(true);">';
				text += '<label for="' + value + '">' + name + ' (' + wordMap[value].count + ')</label>';
				text += '<br>';
			}
			
			text += '<input type="radio" name="topTen" value="custom" id="custom" onClick="disableInput(false);">';
			text += '<input name="customField" value="..." id="customField" onkeydown="if (event.keyCode == 13) {return false;}" disabled>';
			
            document.getElementById('top_ten').innerHTML = text;
        }
    };

    reader.readAsBinaryString(evt.dataTransfer.files[0]);
}

function handleDragOver(evt) {
    progress = document.querySelector('.percent');
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}

// Good stuff

function processText(bigString) {
    var list = splitSentences(bigString);

    var map = [];

    list.forEach(function(s) {

        var words = s.split(" ");

        var previousWord = undefined;

        words.forEach(function(word) {
            var w = map[word];
            if (w == undefined || isFunction(w)) {
                w = new Word(word);
                map[word] = w;
            } else {
                w.increment();
            }

            if (previousWord != undefined) {
                previousWord.addNextWord(w);
            }

            previousWord = w;
        }); // Words
    }); // Sentences

    var values = Object.keys(map).sort(function(a, b) {
        return map[b].count - map[a].count;
    });
	
	var result = {wordMap: map, topTen: values.slice(0, 10)};

    return result;
}

function splitSentences(bigString) {
    var list = [];
    var lines = bigString.replace(/,/g, ' ,').toLowerCase().split(/\r\n|\r|\n/);
    lines.forEach(function(s) {
        var sentences = s.replace(/\r\n|\r|\n/g, " ").trim().split(/(\.|\!|\?)/g);
        sentences.forEach(function(s2) {
            s2 = s2.trim().replace(/(\.|\!|\?)/g, '');
            if (s2 != undefined && s2 != '') {
                list.push(s2);
            }
        }); // sentence
    }); // line

    return list;
}

// -- NEXT WORD --
function NextWord(word) {
    this.word = word;
    this.count = 1;
}

NextWord.prototype.increment = function() {
    this.count++;
}

// -- WORD --

function Word(word) {
    this.word = word;
    this.count = 1;
    this.nextWords = [];
}

Word.prototype.makeRandomSentence = function() {
    var result = this.word;

    var self = this;

    if (Object.keys(self.nextWords).length > 0) {
        self.sort();

        var total = 0;
        Object.keys(self.nextWords).forEach(function(next) {
            total += self.nextWords[next].count;
        });

        var random = Math.random() * total;

        var nextWord = undefined;
        total = 0;
        Object.keys(self.nextWords).every(function(next) {
            total += self.nextWords[next].count;
            if (total > random) {
                nextWord = self.nextWords[next];
                return false;
            }
            return true;
        });

        result += " ";
        result += nextWord.word.makeRandomSentence();
    }
    return result;
}
Word.prototype.increment = function() {
    this.count++;
}
Word.prototype.addNextWord = function(word) {
    var found = this.nextWords[word.word];

    if (found == undefined || isFunction(found)) {
        this.nextWords[word.word] = new NextWord(word);
    } else {
        found.increment();
    }
}
Word.prototype.sort = function() {
    this.nextWords.__proto__.sort(function(a, b) {
        return b.count - a.count;
    });
}

// -- UTIL --
function isFunction(functionToCheck) {
    var getType = {};
    return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}