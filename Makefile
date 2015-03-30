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

.PHONY : all test jshint mocha istanbul browserify typify dist david

BINDIR=node_modules/.bin

MOCHA=$(BINDIR)/mocha
IMOCHA=$(BINDIR)/_mocha
ISTANBUL=$(BINDIR)/istanbul
JSHINT=$(BINDIR)/jshint
BROWSERIFY=$(BINDIR)/browserify
UGLIFY=$(BINDIR)/uglifyjs
TYPIFY=$(BINDIR)/typify
DAVID=$(BINDIR)/david

test : jshint mocha istanbul typify david

jshint :
	echo $(basename foo/bar)
	$(JSHINT) $(SRC)

mocha : 
	$(MOCHA) --reporter=spec $(TESTSRC)

istanbul :
	$(ISTANBUL) cover $(IMOCHA) $(TESTSRC)
	$(ISTANBUL) check-coverage --statements -11 --branches -5 --functions -6

browserify : $(SRC)
	mkdir -p $(DISTDIR)
	$(BROWSERIFY) -s $(BUNDLEVAR) -o $(BUNDLEDST) $(BUNDLESRC)

uglify : browserify $(SRC)
	mkdir -p $(DISTDIR)
	$(UGLIFY) -o $(MINDST) --source-map $(MINMAP) $(MINSRC)

typify :
	$(TYPIFY) $(MOCHA) --timeout 10000 $(TESTSRC)

david :
	$(DAVID)

dist : test uglify
	git clean -fdx -e node_modules
