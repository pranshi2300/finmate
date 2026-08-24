const assert = require('assert');
const { movingAverage, weightedMovingAverage, linearTrendPredict } = require('../src/services/budgetPredictionService');

function approx(a,b,eps=1e-6){return Math.abs(a-b)<=eps}

// moving average
const series = [1,2,3,4,5];
const ma = movingAverage(series, 3);
assert.strictEqual(ma.length, series.length);
assert(approx(ma[2], 2)); // (1+2+3)/3
assert(approx(ma[4], 4)); // (3+4+5)/3

// weighted moving average
const wma = weightedMovingAverage(series, [1,2,3]);
assert.strictEqual(wma.length, series.length);
// last wma according to implementation: weights [1,2,3] applied to slice [3,4,5]
// s = 3*1 + 4*2 + 5*3 = 3 + 8 + 15 = 26 => 26/6 = 4.333...
assert(approx(wma[4], 26/6));

// linear trend
const preds = linearTrendPredict([2,4,6,8], 2);
// linear trend slope=2, intercept=2 => next values 10,12
assert(approx(preds[0], 10));
assert(approx(preds[1], 12));

console.log('predictionAlgorithms tests passed');

