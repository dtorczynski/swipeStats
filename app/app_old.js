(function ( ) {
	"use strict";
  /*
tutorial followed: https://scotch.io/tutorials/how-to-correctly-use-bootstrapjs-and-angularjs-together
code pen example: http://codepen.io/sevilayha/pen/ExKGs
  */
 
var app = angular.module('app', ['ui.bootstrap', 'ui.router','ngAnimate', 'ngTouch', 'ionic.contrib.ui.tinderCards']);

//something for the swipe cards to work, fm following tutorial
app.directive('noScroll', function() {
    return {
        restrict: 'A',
        link: function($scope, $element, $attr) {
            $element.on('touchmove', function(e) {
                e.preventDefault();
            });
        }
    }
})

app.run(function($rootScope, $http, $q){
    //this run seciton will always run. covering the following cases:
    //new user arrived at url swipestats.com <-- will go into the showFirstRandomProp state
    //new user arrived at url swipestats.com/proposition/23 <-- will go into the maincontroller state
    //need to get the numProps before anything can run
    $rootScope.deferTill=$q.defer();
    $rootScope.sessionID = 0;
    $rootScope.numProps = 0;
    $rootScope.propsShown = [];
    $rootScope.nextPropPath='';
    $rootScope.cards = [];
     $rootScope.addCard = function(img, propTitle) {
         var newCard = {image: img, title: propTitle};
         newCard.id = Math.random();
         $rootScope.cards.push(angular.extend({}, newCard));
     };

    // Define Init Function
    $rootScope.init = function () {
       $http.get('/init').
         success(function(params) {
             $rootScope.sessionID = params.sessionID;
             $rootScope.numProps = params.numProps;
             $rootScope.deferTill.resolve(); //ajax is done
         }).
         error(function(data) {
             alert(data);
         });
    }
    $rootScope.init();
})


    //this is for if the user arrived at swipestats.com (or whatever our URL is)
app.controller('showFirstRandomProp', function($http,$scope,$state, $rootScope){
     $rootScope.deferTill.promise.then( function(){
            //this prevents adding cards onto deck if user just navigates between "about" page and home. Todo: need to make this work better (e.g. going back to submit page doesn't change the propsition shown)
            $rootScope.cards = [];
             var newPropIDshowNow = Math.ceil(Math.random() * $rootScope.numProps);
             //huge PITA lesson learned, format of state.go param useage requires object, https://github.com/angular-ui/ui-router/issues/928
            $state.go('proposition',{'propID_urlParam':newPropIDshowNow});
         }
    );
})

app.config(function($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise('/');
    $stateProvider
		// HOME STATES AND NESTED VIEWS ========================================
		.state('home', {
			url: '/',
			templateUrl: 'partial-home.html',
			controller: 'showFirstRandomProp'
		})
	
        .state('proposition', {
          url: '/proposition/:propID_urlParam',
          templateUrl: 'partial-home.html',
          controller: 'mainController'
        })

		.state('submit', {
			url: '/submit',
			templateUrl: 'partial-submit.html',
			controller: 'submitController'
		})
	    .state('about', {
        	url: '/about',
			templateUrl: 'partial-about.html'
    });      
});

app.controller('introDivController', function($scope) {
    // Initialize hideIntro
    $scope.hideIntro = false;
});
    
app.controller('mainController', function($http, $scope,$stateParams,$state, $rootScope) {    



    //The swipe needs to swipe the whole div, not just 1 img (in case the proposition is made of 2 images)

    //This is the same as doing: $scope.propositionPath = $rootScope.nextPropPath;
    //Todo, check to see if we should instead just to currPath=nextPath kinda thing if it's quicker and doesn't need ajax
    $rootScope.deferTill.promise.then(function(){
        console.log('num propositions shown: '+$rootScope.propsShown.length);

        //upon arriving at a new URL:
        // 1) update the url
        // 2) Fetch the proposition and display it
            //if we already have the proposition in the deck, then no need to fetch it again
            //if there is nothing in our deck, then add it
        // 3) Regardless of how we arrived - add a new prop into the deck

        //1) update URL
        $scope.propositionPath = '/images/prop' + $stateParams.propID_urlParam + '.jpg';
        //2) only add the card if there are no cards at all
        if ($rootScope.cards.length==0){
            $rootScope.addCard($scope.propositionPath,$scope.propositionPath);
        }
        //pick the next prop to show in the stack, make sure it wasn't picked before nor the current one being shown
        //E.g. if there's 3 props total, user already shown/picked prop1, prop3, so prop2 was the nextPropPath, now the current propPath
        //we have no more props to show, even though propsShown.length is 2, because we're alreadying showing the only prop left
        var newPropID=Math.ceil(Math.random() * $rootScope.numProps);
        if ($rootScope.propsShown.length < $rootScope.numProps -1 ){
            while ( ($.inArray('/images/prop' + newPropID + '.jpg', $rootScope.propsShown ) >= 0) || ('/images/prop' + newPropID + '.jpg') ==  ($scope.propositionPath) ) {
                newPropID=Math.ceil(Math.random() * $rootScope.numProps);
            }
            $rootScope.nextPropPath='/images/prop' + newPropID + '.jpg';
        } else{
            $rootScope.nextPropPath=$scope.propositionPath;
        }
        $rootScope.addCard($rootScope.nextPropPath,$rootScope.nextPropPath);
    


        // Define click function
        $scope.propositionClicked = function(choice){
            $scope.cards.splice(0, 1);
            // ajax call to server to post
            var propData = {sessionID: $scope.sessionID, proposition: $scope.propositionPath, choice: choice};
            $http.post('/new_choice', propData).
             error(function(msg) {
                 alert(msg);
             });
            // get prediction every n choices
            if ($rootScope.propsShown.length % 2 == 0 && $rootScope.propsShown.length>0) {
              $http.post('/prediction',{sessionID: $scope.sessionID}).
                success(function(msg) {
                  alert(msg);
                }).
                error(function(msg) {
                  alert(msg);
                });
            }

            //Mark prop as shown. Since this is inside propositionClicked, we'll only mark the prop as shown after user has made a selection (otherwise user might go to about page and come back and it has used up a prop)
            if ($rootScope.propsShown.length < $rootScope.numProps) {
                $rootScope.propsShown.push($scope.propositionPath);
            } else{
              console.log('showed all propositions');
            }

            //go to new proposition
            $state.go('proposition',{'propID_urlParam':newPropID});
          }

        $scope.$parent.keyPressed = function(event){
          console.log(event.keyCode + " In child scope.");
          if (event.keyCode == 38)
              console.log("up arrow");
          else if (event.keyCode == 39){
              console.log("right arrow");
            $scope.propositionClicked(1);
          }
          else if (event.keyCode == 40)
            console.log("down arrow");
          else if (event.keyCode == 37){
              console.log("left arrow");
            $scope.propositionClicked(0);
          }
        }

        //Swipe related. A single swipe left for example will cause cardSwipedLeft, transitionLeft, transitionOut, cardDestoryed in that order
        //note, needed to perform this fix on ionic.tdcards.js, https://github.com/driftyco/ionic-ion-tinder-cards/issues/65#issuecomment-100679906
        $scope.cardSwipedLeft = function(index) {
            console.log('Left swipe');
            
        }
        $scope.cardSwipedRight = function(index) {
            console.log('Right swipe');
        }
        $scope.cardDestroyed = function(index) {
          //$scope.cards.splice(index, 1);
          $scope.propositionClicked($scope.choice);
          console.log('Card destroyed');
        }
        $scope.transitionOut = function(card) {
          console.log('card transition out');
        };
        $scope.transitionRight = function(card) {
          console.log('card removed to the right');
          $scope.choice=1;
          console.log(card);
        };
        $scope.transitionLeft = function(card) {
          console.log('card removed to the left');
          $scope.choice=0;
          console.log(card);
        };

    })
});
 
app.controller('submitController', function($http,$scope,$stateParams,$state) {
    // Define submit form function
    $scope.sendSubmitForm = function(submitFormData) {
        $http.post('/new_proposition', submitFormData).
          success(function(){
            alert('Submission successful!');
            $scope.resetSubmitForm();
          }).
          error(function(msg){
            alert(msg);
          });
    };
    // Definei reset form function
    $scope.resetSubmitForm = function() {
      $scope.submitFormData = {};
    };
    $scope.resetSubmitForm();
});




app.controller('BodyController', function($http, $scope, $stateParams,$state) {
    // Initialize App Variables

    //updated on 7/19/2015 - moved these to this body controller
    //mainController is re-run every time the url/state is entered (so if user goes to check out about page and comes back, a new session starts)
    //Way to fix this would be to have a global sort of scope either through parent-child scope (which was what this, or with services, which was not used)
    //https://rclayton.silvrback.com/parent-child-controller-communication
    //http://crudbetter.com/angular-share-data-between-controllers/
    //An example for using service that was not used http://fdietz.github.io/recipes-with-angular-js/controllers/sharing-code-between-controllers-using-services.html
    //mainly because I didn't want to inject the service into all the controllers




    //This listens for button presses (arrow keys throughout the whole app, attached to the body)
    $scope.keyPressed = function(event){
    //If it wasn't attached to the body, user would have to had specifically clicked on a div for it to be able to pick up arrow presses
    //It doesn't have to be fully defined though
    }


});
})(); 

//  NOTES  //
//Reason why the whole thing is wrapped in parenthesis for javascript to work
//http://stackoverflow.com/questions/9053842/advanced-javascript-why-is-this-function-wrapped-in-parentheses