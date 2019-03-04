all : test

SRC=lib/*.js
TESTSRC=test

DISTDIR=dist
DISTPREFIX=typify

BUNDLESRC=lib/typify.js
BUNDLEDST=$(DISTDIR)/$(DISTPREFIX).standalone.js
BUNDLEVAR=jsc

MINSRC=$(BUNDLEDST)
MINDST=$(DISTDIR)/$(DISTPREFIX).min.js
MINMAP=$(DISTDIR)/$(DISTPREFIX).min.js.map

.PHONY : all test eslint mocha istanbul browserify typify dist david

BINDIR=node_modules/.bin

MOCHA=$(BINDIR)/_mocha
ESLINT=$(BINDIR)/eslint
NYC=$(BINDIR)/nyc
BROWSERIFY=$(BINDIR)/browserify
UGLIFY=$(BINDIR)/uglifyjs
TYPIFY=$(BINDIR)/typify
DAVID=$(BINDIR)/david

test : eslint mocha istanbul typify david

eslint :
	$(ESLINT) $(SRC)

mocha : 
	$(MOCHA) --reporter=spec $(TESTSRC)

istanbul :
	$(NYC) -r text -r html $(MOCHA) test
	$(NYC) check-coverage -statements -11 --branches -5 --functions -6

browserify : $(SRC)
	mkdir -p $(DISTDIR)
	$(BROWSERIFY) -s $(BUNDLEVAR) -o $(BUNDLEDST) $(BUNDLESRC)

uglify : browserify $(SRC)
	mkdir -p $(DISTDIR)
	$(UGLIFY) -o $(MINDST) --source-map $(MINMAP) $(MINSRC)

typify :
	$(TYPIFY) -- $(MOCHA) --timeout 20000 $(TESTSRC)

david :
	$(DAVID)

dist : test uglify
	git clean -fdx -e node_modules
