angular.module('eliquid', ['LocalStorageModule', 'pascalprecht.translate']);

angular.module('eliquid').controller('eliquidCtrl', function ($scope, localStorageService, $http, $translate) {
    $scope.changeLocale = function() {
        if ($scope.model.prefLocale == null) {
            $scope.model.prefLocale = "ru";
        }
        $translate.use($scope.model.prefLocale);
        $scope.save();
    }

    $scope.solve = function () {
        var lp = glp_create_prob();
        glp_set_prob_name(lp, "eliquid");
        glp_set_obj_dir(lp, GLP_MIN);

        var m = 5;
        glp_add_rows(lp, m);
        glp_set_row_name(lp, 1, "t_pg");
        glp_set_row_bnds(lp, 1, GLP_FX, $scope.model.current.t_pg/100, $scope.model.current.t_pg/100);
        glp_set_row_name(lp, 2, "t_vg");
        glp_set_row_bnds(lp, 2, GLP_FX, $scope.model.current.t_vg/100, $scope.model.current.t_vg/100);
        glp_set_row_name(lp, 3, "t_ad");
        glp_set_row_bnds(lp, 3, GLP_FX, $scope.model.current.t_ad/100, $scope.model.current.t_ad/100);
        glp_set_row_name(lp, 4, "t_pg");
        glp_set_row_bnds(lp, 4, GLP_FX, $scope.model.current.t_ni, $scope.model.current.t_ni);
        glp_set_row_name(lp, 5, "t_vol");
        glp_set_row_bnds(lp, 5, GLP_FX, 1.0, 1.0);
        
        var n = $scope.model.current.A.length;
        glp_add_cols(lp, n);
        for (i = 0; i < n; ++i) {
            glp_set_col_name(lp, i + 1, $scope.model.current.A[i].name);
            var xLB = $scope.model.current.A[i].lb/$scope.model.current.t_vol, xUB = $scope.model.current.A[i].ub/$scope.model.current.t_vol;
            glp_set_col_bnds(lp, i + 1, xLB == xUB ? GLP_FX : GLP_DB, xLB, xUB);
            glp_set_obj_coef(lp, i + 1, $scope.model.current.A[i].price);
        }
        
        var ia = [0.0], ja = [0.0], ar = [0.0];
        for (j = 0; j < n; ++ j) {
            ia.push(0 + 1);
            ja.push(j + 1);
            ar.push($scope.model.current.A[j].pg/100);
            ia.push(1 + 1);
            ja.push(j + 1);
            ar.push($scope.model.current.A[j].vg/100);
            ia.push(2 + 1);
            ja.push(j + 1);
            ar.push($scope.model.current.A[j].ad/100);
            ia.push(3 + 1);
            ja.push(j + 1);
            ar.push($scope.model.current.A[j].ni);
            ia.push(4 + 1);
            ja.push(j + 1);
            ar.push(1.0);
        }
        glp_load_matrix(lp, m*n, ia, ja, ar);
        
        var parm = new SMCP();
        parm.msg_lev = GLP_MSG_DBG;
        var error = glp_simplex(lp, parm);
        $scope.model.current.status = glp_get_status(lp);
        var obj = glp_get_obj_val(lp);
        $scope.model.current.t_cost = round2(obj*$scope.model.current.t_vol);
        for (i = 0; i < n; ++ i) {
            var prim = glp_get_col_prim(lp, i + 1);
            $scope.model.current.A[i].x = round2(prim*$scope.model.current.t_vol);
            $scope.model.current.A[i].xd = $scope.dropsVol(prim*$scope.model.current.t_vol);
        }
        return error;
    }
    
    $scope.save = function () {
        localStorageService.set("eliquidStorage", $scope.model);
        $scope.dbdirty = true;
    }
    
    $scope.update = function () {
        $scope.calcDrops();
        $scope.error = $scope.solve();
        $scope.save();
    }
    
    $scope.afterLoad = function () {
        $scope.changeLocale();
        $scope.calcDrops();
        $scope.error = $scope.solve();
    }

    $scope.createModel = function () {
        $http.get("db.json", {}).then(function (resp) {
            $scope.model = resp.data;
            $scope.afterLoad();
            $scope.dbdirty = true;
        }, function (error) {
            console.log(error);
        });
    }
    
    $scope.addDb = function () {
        $scope.model.db.push($scope.emptyLiquid());
    }
    
    $scope.calcDrops = function (doSave) {
        for (var i = 0; i < $scope.model.current.A.length; ++i) {
            $scope.model.current.A[i].lbd = $scope.dropsVol($scope.model.current.A[i].lb);
            $scope.model.current.A[i].ubd = $scope.dropsVol($scope.model.current.A[i].ub);
        }
        if (doSave == true)
            $scope.save();
    }
    
    $scope.deleteDb = function (a) {
        $scope.model.db.clean(a);
    }
    
    $scope.emptyLiquid = function () {
        return {"name":  "", "pg": 100, "vg":   0, "ad":   0, "ni":0, "lb": 0, "lbd": 0, "ub":  100, "ubd":  $scope.dropsVol(100), "x": 0, "price": 0.0, comment: ""};
    }
    
    $scope.addCalc = function () {
        if ($scope.itemName == "") {
            $scope.model.current.A.push($scope.emptyLiquid());
        }
        else {
            var filtered = $scope.model.db.filter(function (i) { return i.name == $scope.itemName});
            if (filtered.length > 0)
                $scope.model.current.A.push(filtered[0]);
            else
                $scope.model.current.A.push($scope.emptyLiquid());
        }
        $scope.update();
    }
    
    $scope.deleteCalc = function (a) {
        $scope.model.current.A.clean(a);
        $scope.update();
    }
    
    $scope.addMix = function () {
        $scope.model.mixes = $scope.model.mixes || [];
        var filtered = $scope.model.mixes.filter(function (m) { return m.name == $scope.model.current.name; });
        if (filtered.length == 0) {
            $scope.model.mixes.push(angular.copy($scope.model.current));
        }
        else {
            angular.copy($scope.model.current, filtered[0]);
        }
        $scope.save();
    }
    $scope.deleteMix = function (a) {
        $scope.model.mixes.clean(a);
        $scope.save();
    }
    $scope.openMix = function (a) {
        $scope.model.current = angular.copy(a);
        $scope.update();
    }
    
    $scope.dropsVol = function(x) {
        return round2(x*$scope.model.dropsPml);
    }
    
    $scope.changeDropsLB = function(i) {
        $scope.model.current.A[i].lb = $scope.model.current.A[i].lbd/$scope.model.dropsPml;
        $scope.update();
    }
    
    $scope.changeDropsUB = function(i) {
        $scope.model.current.A[i].ub = $scope.model.current.A[i].ubd/$scope.model.dropsPml;
        $scope.update();
    }
    
    $scope.clear = function () {
        localStorageService.clearAll();
        $scope.createModel();
    }
    
    $scope.db_logout = function () {
        $scope.dropbox.signOut(function (error) {
            if (error) {
                console.log(error);
                return;
            }
            $scope.userInfo = null;
            $scope.$digest();
        });
    }
    
    $scope.db_login = function () {
        $scope.dropbox.authenticate(function (error, data) { 
            if (error) {
                console.log(error);
                return;
            }
            $scope.dropbox.getAccountInfo(function (error, userInfo) {
                if (error) {
                    console.log(error);
                    return;
                }
                console.log(userInfo.name);
                $scope.userInfo = userInfo;
                $scope.$digest();
                if ($scope.model.readOnLogin == true) {
                    $scope.db_read();
                }
            });
        });
    }
    
    $scope.db_read = function () {
        $scope.dropbox.readFile("db.json", function (error, data, stat) {
            if (error) {
                console.log(error);
                return;
            }
            console.log(stat);
            $scope.model = angular.fromJson(data);
            $scope.afterLoad();
            $scope.update();
            $scope.dbdirty = false;
            $scope.$digest();
        });
    }
    
    $scope.db_write = function () {
        $scope.dropbox.writeFile("db.json", angular.toJson($scope.model), function (error, stat) {
            if (error) {
                console.log(error);
                return;
            }
            console.log(stat);
            $scope.dbdirty = false;
            $scope.$digest();
        });
    }

    $scope.load = function () {
        var model = localStorageService.get("eliquidStorage");
        return model;
    }
    
    $scope.init = function () {
        $scope.dropbox = new Dropbox.Client({key: "0ayru3dp9e3nn24"});
        $scope.dropbox.authenticate({interactive: false}, function(error, client) {
            if (error) {
                console.log(error);
                return;
            }
            if (client.isAuthenticated()) {
                $scope.dropbox.getAccountInfo(function (error, userInfo) {
                    if (error) {
                        console.log(error);
                        return;
                    }
                    console.log(userInfo.name);
                    $scope.userInfo = userInfo;
                    if ($scope.model.readOnLogin == true) {
                        $scope.db_read();
                    }
                    $scope.$digest();
                });
            }
        });
        $scope.model = $scope.load();
        if ($scope.model == null) {
            $scope.createModel();
        }
        else {
            $scope.update();
        }
    }
    
    $scope.init();
});

function round2(v) {
    return parseFloat((v).toFixed(2));
}

Array.prototype.move = function (old_index, new_index) {
    while (old_index < 0) {
        old_index += this.length;
    }
    while (new_index < 0) {
        new_index += this.length;
    }
    if (new_index >= this.length) {
        var k = new_index - this.length;
        while ((k--) + 1) {
            this.push(undefined);
        }
    }
    this.splice(new_index, 0, this.splice(old_index, 1)[0]);
    return this; // for testing purposes
};

Array.prototype.clean = function(deleteValue) {
    for (var i = 0; i < this.length; i++) {
        if (this[i] == deleteValue) {
            this.splice(i, 1);
            i--;
        }
    }
    return this;
};

if (!Array.prototype.filter) {
  Array.prototype.filter = function(fun /*, thisp*/) {
    var len = this.length >>> 0;
    if (typeof fun != "function")
    throw new TypeError();

    var res = [];
    var thisp = arguments[1];
    for (var i = 0; i < len; i++) {
      if (i in this) {
        var val = this[i]; // in case fun mutates this
        if (fun.call(thisp, val, i, this))
        res.push(val);
      }
    }
    return res;
  };
}

glp_set_print_func(function (data) { console.log(data); });

angular.module('eliquid').config(function ($translateProvider) {
    $translateProvider.useStaticFilesLoader({
        prefix: 'locale-',
        suffix: '.json'
    });
    $translateProvider.preferredLanguage('ru');
    $translateProvider.useSanitizeValueStrategy('escape');
});