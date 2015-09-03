/*
 * Copyright (C) 2015 Jorge Ruesga
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
(function ($) {
    var options = {
        series: { dynthreshold: null } // or { dataset: dataset ref, color: color spec}
    };
    
    function init(plot) {
        function thresholdData(plot, s, datapoints, belowMap, color) {
            var ps = datapoints.pointsize, i, x, y, p, prevp,
                thresholded = $.extend({}, s); // note: shallow copy

            thresholded.datapoints = { points: [], pointsize: ps, format: datapoints.format };
            thresholded.label = null;
            thresholded.color = color;
            thresholded.dynthreshold = null;
            thresholded.originSeries = s;
            thresholded.data = [];
 
            var origpoints = datapoints.points;

            var threspoints = [];
            var newpoints = [];
            var m;

            for (i = 0; i < origpoints.length; i += ps) {
                x = origpoints[i];
                y = origpoints[i + 1];
                m = origpoints[i + 2];
                var below = belowMap[x];
                if (y < below){
                    if (i > 0) {
                        var x1 = origpoints[i - ps];
                        var y1 = origpoints[i - ps + 1];
                        var m1 = origpoints[i - ps + 2];
                        var below1 = belowMap[x1];
                        if (y1 < below1) {
                            newpoints.push(null);
                            newpoints.push(null);
                            newpoints.push(null);
                        } else if (y1 > below1) {
                            threspoints.push(null);
                            threspoints.push(null);
                            threspoints.push(null);
                        }
                    }
                }
                if (y >= below){
                    var result = null;
                    if (i > 0) {
                        var x1 = origpoints[i - ps];
                        var y1 = origpoints[i - ps + 1];
                        var m1 = origpoints[i - ps + 2];
                        var below1 = belowMap[x1];
                        if (y1 < below1) {
                            result = lineIntersection(x1,y1,x,y,x1,below1,x,below);
                            newpoints.push(result.x);
                            newpoints.push(result.y);
                            newpoints.push(result.y);
                            threspoints.push(x1);
                            threspoints.push(y1);
                            threspoints.push(m1);
                        }
                    }
                    newpoints.push(x);
                    newpoints.push(y);
                    newpoints.push(m);
                    if (result) {
                        threspoints.push(result.x);
                        threspoints.push(result.y);
                        threspoints.push(result.y);
                    }
                } else {
                    var result = null;
                    if (i > 0) {
                        var x1 = origpoints[i - ps];
                        var y1 = origpoints[i - ps + 1];
                        var m1 = origpoints[i - ps + 2];
                        var below1 = belowMap[x1];
                        if (y1 > below1) {
                            result = lineIntersection(x1,y1,x,y,x1,below1,x,below);
                            newpoints.push(result.x);
                            newpoints.push(result.y);
                            newpoints.push(result.y);
                            newpoints.push(null);
                            newpoints.push(null);
                            newpoints.push(null);
                            threspoints.push(null);
                            threspoints.push(null);
                            threspoints.push(null);
                            threspoints.push(result.x);
                            threspoints.push(result.y);
                            threspoints.push(result.y);
                        }
                    }
                }
                if (y <= below){
                    threspoints.push(x);
                    threspoints.push(y);
                    threspoints.push(m);
                }
            }

            datapoints.points = newpoints;
            thresholded.datapoints.points = threspoints;

            if (thresholded.datapoints.points.length > 0) {
                var origIndex = $.inArray(s, plot.getData());
                // Insert newly-generated series right after original one (to prevent it from becoming top-most)
                plot.getData().splice(origIndex + 1, 0, thresholded);
            }
        }

        function lineIntersection(l1x1, l1y1, l1x2, l1y2, l2x1, l2y1, l2x2, l2y2) {
            var denom, a, b, num1, num2, result = {
                x: null,
                y: null,
                hit1: false,
                hit2: false
            };
            denom = ((l2y2 - l2y1) * (l1x2 - l1x1)) - ((l2x2 - l2x1) * (l1y2 - l1y1));
            if (denom == 0) {
                return result;
            }
            a = l1y1 - l2y1;
            b = l1x1 - l2x1;
            num1 = ((l2x2 - l2x1) * a) - ((l2y2 - l2y1) * b);
            num2 = ((l1x2 - l1x1) * a) - ((l1y2 - l1y1) * b);
            a = num1 / denom;
            b = num2 / denom;
            result.x = l1x1 + (a * (l1x2 - l1x1));
            result.y = l1y1 + (a * (l1y2 - l1y1));
            if (a > 0 && a < 1) {
                result.hit1 = true;
            }
            if (b > 0 && b < 1) {
                result.hit2 = true;
            }
            return result;
        };

        function processThresholds(plot, s, datapoints) {
            if (!s.dynthreshold)
                return;

            var belowMap = toMap(s.dynthreshold.dataset.data);
            for (var i=0; i < datapoints.points.length; i+=s.datapoints.pointsize) {
                var x = datapoints.points[i];
                var m = i + s.datapoints.pointsize - 1;
                datapoints.points[m] = belowMap[x];
            }

            thresholdData(plot, s, datapoints, belowMap, s.dynthreshold.color);
        }

        function toMap(data) {
            var map = {};
            for (var i = 0; i < data.length; i++) {
                map[data[i][0]] = data[i][1];
            }
            return map;
        }

        plot.hooks.processDatapoints.push(processThresholds);
    }
    
    $.plot.plugins.push({
        init: init,
        options: options,
        name: 'dynthreshold',
        version: '1.0'
    });
})(jQuery);
