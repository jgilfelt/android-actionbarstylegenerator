/*
Copyright 2010 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/*
	Base.js, version 1.1
	Copyright 2006-2007, Dean Edwards
	License: http://www.opensource.org/licenses/mit-license.php
*/

var Base = function() {
	// dummy
};

Base.extend = function(_instance, _static) { // subclass
	var extend = Base.prototype.extend;
	
	// build the prototype
	Base._prototyping = true;
	var proto = new this;
	extend.call(proto, _instance);
	delete Base._prototyping;
	
	// create the wrapper for the constructor function
	//var constructor = proto.constructor.valueOf(); //-dean
	var constructor = proto.constructor;
	var klass = proto.constructor = function() {
		if (!Base._prototyping) {
			if (this._constructing || this.constructor == klass) { // instantiation
				this._constructing = true;
				constructor.apply(this, arguments);
				delete this._constructing;
			} else if (arguments[0] != null) { // casting
				return (arguments[0].extend || extend).call(arguments[0], proto);
			}
		}
	};
	
	// build the class interface
	klass.ancestor = this;
	klass.extend = this.extend;
	klass.forEach = this.forEach;
	klass.implement = this.implement;
	klass.prototype = proto;
	klass.toString = this.toString;
	klass.valueOf = function(type) {
		//return (type == "object") ? klass : constructor; //-dean
		return (type == "object") ? klass : constructor.valueOf();
	};
	extend.call(klass, _static);
	// class initialisation
	if (typeof klass.init == "function") klass.init();
	return klass;
};

Base.prototype = {	
	extend: function(source, value) {
		if (arguments.length > 1) { // extending with a name/value pair
			var ancestor = this[source];
			if (ancestor && (typeof value == "function") && // overriding a method?
				// the valueOf() comparison is to avoid circular references
				(!ancestor.valueOf || ancestor.valueOf() != value.valueOf()) &&
				/\bbase\b/.test(value)) {
				// get the underlying method
				var method = value.valueOf();
				// override
				value = function() {
					var previous = this.base || Base.prototype.base;
					this.base = ancestor;
					var returnValue = method.apply(this, arguments);
					this.base = previous;
					return returnValue;
				};
				// point to the underlying method
				value.valueOf = function(type) {
					return (type == "object") ? value : method;
				};
				value.toString = Base.toString;
			}
			this[source] = value;
		} else if (source) { // extending with an object literal
			var extend = Base.prototype.extend;
			// if this object has a customised extend method then use it
			if (!Base._prototyping && typeof this != "function") {
				extend = this.extend || extend;
			}
			var proto = {toSource: null};
			// do the "toString" and other methods manually
			var hidden = ["constructor", "toString", "valueOf"];
			// if we are prototyping then include the constructor
			var i = Base._prototyping ? 0 : 1;
			while (key = hidden[i++]) {
				if (source[key] != proto[key]) {
					extend.call(this, key, source[key]);

				}
			}
			// copy each of the source object's properties to this object
			for (var key in source) {
				if (!proto[key]) extend.call(this, key, source[key]);
			}
		}
		return this;
	},

	base: function() {
		// call this method from any other method to invoke that method's ancestor
	}
};

// initialise
Base = Base.extend({
	constructor: function() {
		this.extend(arguments[0]);
	}
}, {
	ancestor: Object,
	version: "1.1",
	
	forEach: function(object, block, context) {
		for (var key in object) {
			if (this.prototype[key] === undefined) {
				block.call(context, object[key], key, object);
			}
		}
	},
		
	implement: function() {
		for (var i = 0; i < arguments.length; i++) {
			if (typeof arguments[i] == "function") {
				// if it's a function, call it
				arguments[i](this.prototype);
			} else {
				// add the interface using the extend method
				this.prototype.extend(arguments[i]);
			}
		}
		return this;
	},
	
	toString: function() {
		return String(this.valueOf());
	}
});

(function() {

var imagelib = {};

// A modified version of bitmap.js from http://rest-term.com/archives/2566/

var Class = {
  create : function() {
    var properties = arguments[0];
    function self() {
      this.initialize.apply(this, arguments);
    }
    for(var i in properties) {
      self.prototype[i] = properties[i];
    }
    if(!self.prototype.initialize) {
      self.prototype.initialize = function() {};
    }
    return self;
  }
};

var ConvolutionFilter = Class.create({
  initialize : function(matrix, divisor, bias, separable) {
    this.r = (Math.sqrt(matrix.length) - 1) / 2;
    this.matrix = matrix;
    this.divisor = divisor;
    this.bias = bias;
    this.separable = separable;
  },
  apply : function(src, dst) {
    var w = src.width, h = src.height;
    var srcData = src.data;
    var dstData = dst.data;
    var di, si, idx;
    var r, g, b;

    //if (this.separable) {
      // TODO: optimize if linearly separable ... may need changes to divisor
      // and bias calculations
    //} else {
      // Not linearly separable
      for(var y=0;y<h;++y) {
        for(var x=0;x<w;++x) {
          idx = r = g = b = 0;
          di = (y*w + x) << 2;
          for(var ky=-this.r;ky<=this.r;++ky) {
            for(var kx=-this.r;kx<=this.r;++kx) {
              si = (Math.max(0, Math.min(h - 1, y + ky)) * w +
                    Math.max(0, Math.min(w - 1, x + kx))) << 2;
              r += srcData[si]*this.matrix[idx];
              g += srcData[si + 1]*this.matrix[idx];
              b += srcData[si + 2]*this.matrix[idx];
              //a += srcData[si + 3]*this.matrix[idx];
              idx++;
            }
          }
          dstData[di] = r/this.divisor + this.bias;
          dstData[di + 1] = g/this.divisor + this.bias;
          dstData[di + 2] = b/this.divisor + this.bias;
          //dstData[di + 3] = a/this.divisor + this.bias;
          dstData[di + 3] = 255;
        }
      }
    //}
    // for Firefox
    //dstData.forEach(function(n, i, arr) { arr[i] = n<0 ? 0 : n>255 ? 255 : n; });
  }
});/*
 * glfx.js
 * http://evanw.github.com/glfx.js/
 *
 * Copyright 2011 Evan Wallace
 * Released under the MIT license
 */
var fx=function(){function n(b,c,d){return Math.max(b,Math.min(c,d))}function v(b){return{_:b,loadContentsOf:function(c){this._.loadContentsOf(c)},destroy:function(){this._.destroy()}}}function C(b){return v(r.fromElement(b))}function D(b,c){var d=a.getExtension("OES_texture_float")?a.FLOAT:a.UNSIGNED_BYTE;this._.texture&&this._.texture.destroy();this._.spareTexture&&this._.spareTexture.destroy();this.width=b;this.height=c;this._.texture=new r(b,c,a.RGBA,d);this._.spareTexture=new r(b,c,a.RGBA,d);
this._.extraTexture=this._.extraTexture||new r(0,0,a.RGBA,d);this._.flippedShader=this._.flippedShader||new l(null,"uniform sampler2D texture;varying vec2 texCoord;void main(){gl_FragColor=texture2D(texture,vec2(texCoord.x,1.0-texCoord.y));}");this._.isInitialized=true}function E(b,c,d){if(!this._.isInitialized||b._.width!=this.width||b._.height!=this.height)D.call(this,c?c:b._.width,d?d:b._.height);b._.use();this._.texture.drawTo(function(){l.getDefaultShader().drawRect()});
return this}function F(){this._.texture.use();this._.flippedShader.drawRect();return this}function m(b,c,d,e){(d||this._.texture).use();this._.spareTexture.drawTo(function(){b.uniforms(c).drawRect()});this._.spareTexture.swapWith(e||this._.texture)}function G(b){b.parentNode.insertBefore(this,b);b.parentNode.removeChild(b);return this}function H(){var b=new r(this._.texture.width,this._.texture.height,a.RGBA,a.UNSIGNED_BYTE);this._.texture.use();b.drawTo(function(){l.getDefaultShader().drawRect()});
return v(b)}function w(){var b=this._.texture.width,c=this._.texture.height,d=new Uint8Array(b*c*4);this._.texture.drawTo(function(){a.readPixels(0,0,b,c,a.RGBA,a.UNSIGNED_BYTE,d)});return d}function I(b){var c=this._.texture.width,d=this._.texture.height,e=w.call(this),f=document.createElement("canvas"),g=f.getContext("2d");f.width=c;f.height=d;c=g.createImageData(c,d);for(d=0;d<e.length;d++)c.data[d]=e[d];g.putImageData(c,0,0);return f.toDataURL(b)}function k(b){return function(){a=this._.gl;return b.apply(this,
arguments)}}function x(b,c,d,e,f,g,h,i){var j=d-f,o=e-g,p=h-f,y=i-g;f=b-d+f-h;g=c-e+g-i;var z=j*y-p*o;p=(f*y-p*g)/z;j=(j*g-f*o)/z;return[d-b+p*d,e-c+p*e,p,h-b+j*h,i-c+j*i,j,b,c,1]}function A(b){var c=b[0],d=b[1],e=b[2],f=b[3],g=b[4],h=b[5],i=b[6],j=b[7];b=b[8];var o=c*g*b-c*h*j-d*f*b+d*h*i+e*f*j-e*g*i;return[(g*b-h*j)/o,(e*j-d*b)/o,(d*h-e*g)/o,(h*i-f*b)/o,(c*b-e*i)/o,(e*f-c*h)/o,(f*j-g*i)/o,(d*i-c*j)/o,(c*g-d*f)/o]}function J(b,c){return[b[0]*c[0]+b[1]*c[3]+b[2]*c[6],b[0]*c[1]+b[1]*c[4]+b[2]*c[7],
b[0]*c[2]+b[1]*c[5]+b[2]*c[8],b[3]*c[0]+b[4]*c[3]+b[5]*c[6],b[3]*c[1]+b[4]*c[4]+b[5]*c[7],b[3]*c[2]+b[4]*c[5]+b[5]*c[8],b[6]*c[0]+b[7]*c[3]+b[8]*c[6],b[6]*c[1]+b[7]*c[4]+b[8]*c[7],b[6]*c[2]+b[7]*c[5]+b[8]*c[8]]}function B(b){var c=b.length;this.xa=[];this.ya=[];this.u=[];this.y2=[];b.sort(function(g,h){return g[0]-h[0]});for(var d=0;d<c;d++){this.xa.push(b[d][0]);this.ya.push(b[d][1])}this.u[0]=0;this.y2[0]=0;for(d=1;d<c-1;++d){b=this.xa[d+1]-this.xa[d-1];var e=(this.xa[d]-this.xa[d-1])/b,f=e*this.y2[d-
1]+2;this.y2[d]=(e-1)/f;this.u[d]=(6*((this.ya[d+1]-this.ya[d])/(this.xa[d+1]-this.xa[d])-(this.ya[d]-this.ya[d-1])/(this.xa[d]-this.xa[d-1]))/b-e*this.u[d-1])/f}this.y2[c-1]=0;for(d=c-2;d>=0;--d)this.y2[d]=this.y2[d]*this.y2[d+1]+this.u[d]}function t(b,c){return new l(null,b+"uniform sampler2D texture;uniform vec2 texSize;varying vec2 texCoord;void main(){vec2 coord=texCoord*texSize;"+c+"gl_FragColor=texture2D(texture,coord/texSize);vec2 clampedCoord=clamp(coord,vec2(0.0),texSize);if(coord!=clampedCoord){gl_FragColor.a*=max(0.0,1.0-length(coord-clampedCoord));}}")}
function K(b,c){a.brightnessContrast=a.brightnessContrast||new l(null,"uniform sampler2D texture;uniform float brightness;uniform float contrast;varying vec2 texCoord;void main(){vec4 color=texture2D(texture,texCoord);color.rgb+=brightness;if(contrast>0.0){color.rgb=(color.rgb-0.5)/(1.0-contrast)+0.5;}else{color.rgb=(color.rgb-0.5)*(1.0+contrast)+0.5;}gl_FragColor=color;}");
m.call(this,a.brightnessContrast,{brightness:n(-1,b,1),contrast:n(-1,c,1)});return this}function s(b){b=new B(b);for(var c=[],d=0;d<256;d++)c.push(n(0,Math.floor(b.interpolate(d/255)*256),255));return c}function L(b,c,d){b=s(b);if(arguments.length==1)c=d=b;else{c=s(c);d=s(d)}for(var e=[],f=0;f<256;f++)e.splice(e.length,0,b[f],c[f],d[f],255);this._.extraTexture.initFromBytes(256,1,e);this._.extraTexture.use(1);a.curves=a.curves||new l(null,"uniform sampler2D texture;uniform sampler2D map;varying vec2 texCoord;void main(){vec4 color=texture2D(texture,texCoord);color.r=texture2D(map,vec2(color.r)).r;color.g=texture2D(map,vec2(color.g)).g;color.b=texture2D(map,vec2(color.b)).b;gl_FragColor=color;}");
a.curves.textures({map:1});m.call(this,a.curves,{});return this}function M(b){a.denoise=a.denoise||new l(null,"uniform sampler2D texture;uniform float exponent;uniform float strength;uniform vec2 texSize;varying vec2 texCoord;void main(){vec4 center=texture2D(texture,texCoord);vec4 color=vec4(0.0);float total=0.0;for(float x=-4.0;x<=4.0;x+=1.0){for(float y=-4.0;y<=4.0;y+=1.0){vec4 sample=texture2D(texture,texCoord+vec2(x,y)/texSize);float weight=1.0-abs(dot(sample.rgb-center.rgb,vec3(0.25)));weight=pow(weight,exponent);color+=sample*weight;total+=weight;}}gl_FragColor=color/total;}");
for(var c=0;c<2;c++)m.call(this,a.denoise,{exponent:Math.max(0,b),texSize:[this.width,this.height]});return this}function N(b,c){a.hueSaturation=a.hueSaturation||new l(null,"uniform sampler2D texture;uniform float hue;uniform float saturation;varying vec2 texCoord;void main(){vec4 color=texture2D(texture,texCoord);float angle=hue*3.14159265;float s=sin(angle),c=cos(angle);vec3 weights=(vec3(2.0*c,-sqrt(3.0)*s-c,sqrt(3.0)*s-c)+1.0)/3.0;float len=length(color.rgb);color.rgb=vec3(dot(color.rgb,weights.xyz),dot(color.rgb,weights.zxy),dot(color.rgb,weights.yzx));float average=(color.r+color.g+color.b)/3.0;if(saturation>0.0){color.rgb+=(average-color.rgb)*(1.0-1.0/(1.001-saturation));}else{color.rgb+=(average-color.rgb)*(-saturation);}gl_FragColor=color;}");
m.call(this,a.hueSaturation,{hue:n(-1,b,1),saturation:n(-1,c,1)});return this}function O(b){a.noise=a.noise||new l(null,"uniform sampler2D texture;uniform float amount;varying vec2 texCoord;float rand(vec2 co){return fract(sin(dot(co.xy,vec2(12.9898,78.233)))*43758.5453);}void main(){vec4 color=texture2D(texture,texCoord);float diff=(rand(texCoord)-0.5)*amount;color.r+=diff;color.g+=diff;color.b+=diff;gl_FragColor=color;}");
m.call(this,a.noise,{amount:n(0,b,1)});return this}function P(b){a.sepia=a.sepia||new l(null,"uniform sampler2D texture;uniform float amount;varying vec2 texCoord;void main(){vec4 color=texture2D(texture,texCoord);float r=color.r;float g=color.g;float b=color.b;color.r=min(1.0,(r*(1.0-(0.607*amount)))+(g*(0.769*amount))+(b*(0.189*amount)));color.g=min(1.0,(r*0.349*amount)+(g*(1.0-(0.314*amount)))+(b*0.168*amount));color.b=min(1.0,(r*0.272*amount)+(g*0.534*amount)+(b*(1.0-(0.869*amount))));gl_FragColor=color;}");
m.call(this,a.sepia,{amount:n(0,b,1)});return this}function Q(b,c){a.unsharpMask=a.unsharpMask||new l(null,"uniform sampler2D blurredTexture;uniform sampler2D originalTexture;uniform float strength;uniform float threshold;varying vec2 texCoord;void main(){vec4 blurred=texture2D(blurredTexture,texCoord);vec4 original=texture2D(originalTexture,texCoord);gl_FragColor=mix(blurred,original,1.0+strength);}");
this._.extraTexture.ensureFormat(this._.texture);this._.texture.use();this._.extraTexture.drawTo(function(){l.getDefaultShader().drawRect()});this._.extraTexture.use(1);this.triangleBlur(b);a.unsharpMask.textures({originalTexture:1});m.call(this,a.unsharpMask,{strength:c});this._.extraTexture.unuse(1);return this}function R(b){a.vibrance=a.vibrance||new l(null,"uniform sampler2D texture;uniform float amount;varying vec2 texCoord;void main(){vec4 color=texture2D(texture,texCoord);float average=(color.r+color.g+color.b)/3.0;float mx=max(color.r,max(color.g,color.b));float amt=(mx-average)*(-amount*3.0);color.rgb=mix(color.rgb,vec3(mx),amt);gl_FragColor=color;}");
m.call(this,a.vibrance,{amount:n(-1,b,1)});return this}function S(b,c){a.vignette=a.vignette||new l(null,"uniform sampler2D texture;uniform float size;uniform float amount;varying vec2 texCoord;void main(){vec4 color=texture2D(texture,texCoord);float dist=distance(texCoord,vec2(0.5,0.5));color.rgb*=smoothstep(0.8,size*0.799,dist*(amount+size));gl_FragColor=color;}");
m.call(this,a.vignette,{size:n(0,b,1),amount:n(0,c,1)});return this}function T(b,c,d){a.lensBlurPrePass=a.lensBlurPrePass||new l(null,"uniform sampler2D texture;uniform float power;varying vec2 texCoord;void main(){vec4 color=texture2D(texture,texCoord);color=pow(color,vec4(power));gl_FragColor=vec4(color);}");var e="uniform sampler2D texture0;uniform sampler2D texture1;uniform vec2 delta0;uniform vec2 delta1;uniform float power;varying vec2 texCoord;"+
q+"vec4 sample(vec2 delta){float offset=random(vec3(delta,151.7182),0.0);vec4 color=vec4(0.0);float total=0.0;for(float t=0.0;t<=30.0;t++){float percent=(t+offset)/30.0;color+=texture2D(texture0,texCoord+delta*percent);total+=1.0;}return color/total;}";
a.lensBlur0=a.lensBlur0||new l(null,e+"void main(){gl_FragColor=sample(delta0);}");a.lensBlur1=a.lensBlur1||new l(null,e+"void main(){gl_FragColor=(sample(delta0)+sample(delta1))*0.5;}");a.lensBlur2=a.lensBlur2||(new l(null,e+"void main(){vec4 color=(sample(delta0)+2.0*texture2D(texture1,texCoord))/3.0;gl_FragColor=pow(color,vec4(power));}")).textures({texture1:1});e=
[];for(var f=0;f<3;f++){var g=d+f*Math.PI*2/3;e.push([b*Math.sin(g)/this.width,b*Math.cos(g)/this.height])}b=Math.pow(10,n(-1,c,1));m.call(this,a.lensBlurPrePass,{power:b});this._.extraTexture.ensureFormat(this._.texture);m.call(this,a.lensBlur0,{delta0:e[0]},this._.texture,this._.extraTexture);m.call(this,a.lensBlur1,{delta0:e[1],delta1:e[2]},this._.extraTexture,this._.extraTexture);m.call(this,a.lensBlur0,{delta0:e[1]});this._.extraTexture.use(1);m.call(this,a.lensBlur2,{power:1/b,delta0:e[2]});
return this}function U(b,c,d,e,f,g){a.tiltShift=a.tiltShift||new l(null,"uniform sampler2D texture;uniform float blurRadius;uniform float gradientRadius;uniform vec2 start;uniform vec2 end;uniform vec2 delta;uniform vec2 texSize;varying vec2 texCoord;"+q+"void main(){vec4 color=vec4(0.0);float total=0.0;float offset=random(vec3(12.9898,78.233,151.7182),0.0);vec2 normal=normalize(vec2(start.y-end.y,end.x-start.x));float radius=smoothstep(0.0,1.0,abs(dot(texCoord*texSize-start,normal))/gradientRadius)*blurRadius;for(float t=-30.0;t<=30.0;t++){float percent=(t+offset-0.5)/30.0;float weight=1.0-abs(percent);color+=texture2D(texture,texCoord+delta/texSize*percent*radius)*weight;total+=weight;}gl_FragColor=color/total;}");
var h=d-b,i=e-c,j=Math.sqrt(h*h+i*i);m.call(this,a.tiltShift,{blurRadius:f,gradientRadius:g,start:[b,c],end:[d,e],delta:[h/j,i/j],texSize:[this.width,this.height]});m.call(this,a.tiltShift,{blurRadius:f,gradientRadius:g,start:[b,c],end:[d,e],delta:[-i/j,h/j],texSize:[this.width,this.height]});return this}function V(b){a.triangleBlur=a.triangleBlur||new l(null,"uniform sampler2D texture;uniform vec2 delta;varying vec2 texCoord;"+q+"void main(){vec4 color=vec4(0.0);float total=0.0;float offset=random(vec3(12.9898,78.233,151.7182),0.0);for(float t=-30.0;t<=30.0;t++){float percent=(t+offset-0.5)/30.0;float weight=1.0-abs(percent);color+=texture2D(texture,texCoord+delta*percent)*weight;total+=weight;}gl_FragColor=color/total;}");
m.call(this,a.triangleBlur,{delta:[b/this.width,0]});m.call(this,a.triangleBlur,{delta:[0,b/this.height]});return this}function W(b,c,d){a.zoomBlur=a.zoomBlur||new l(null,"uniform sampler2D texture;uniform vec2 center;uniform float strength;uniform vec2 texSize;varying vec2 texCoord;"+q+"void main(){vec4 color=vec4(0.0);float total=0.0;vec2 toCenter=center-texCoord*texSize;float offset=random(vec3(12.9898,78.233,151.7182),0.0);for(float t=0.0;t<=40.0;t++){float percent=(t+offset)/40.0;float weight=4.0*(percent-percent*percent);color+=texture2D(texture,texCoord+toCenter*percent*strength/texSize)*weight;total+=weight;}gl_FragColor=color/total;}");
m.call(this,a.zoomBlur,{center:[b,c],strength:d,texSize:[this.width,this.height]});return this}function X(b,c,d,e){a.colorHalftone=a.colorHalftone||new l(null,"uniform sampler2D texture;uniform vec2 center;uniform float angle;uniform float scale;uniform vec2 texSize;varying vec2 texCoord;float pattern(float angle){float s=sin(angle),c=cos(angle);vec2 tex=texCoord*texSize-center;vec2 point=vec2(c*tex.x-s*tex.y,s*tex.x+c*tex.y)*scale;return(sin(point.x)*sin(point.y))*4.0;}void main(){vec4 color=texture2D(texture,texCoord);vec3 cmy=1.0-color.rgb;float k=min(cmy.x,min(cmy.y,cmy.z));cmy=(cmy-k)/(1.0-k);cmy=clamp(cmy*10.0-3.0+vec3(pattern(angle+0.26179),pattern(angle+1.30899),pattern(angle)),0.0,1.0);k=clamp(k*10.0-5.0+pattern(angle+0.78539),0.0,1.0);gl_FragColor=vec4(1.0-cmy-k,color.a);}");
m.call(this,a.colorHalftone,{center:[b,c],angle:d,scale:Math.PI/e,texSize:[this.width,this.height]});return this}function Y(b,c,d,e){a.dotScreen=a.dotScreen||new l(null,"uniform sampler2D texture;uniform vec2 center;uniform float angle;uniform float scale;uniform vec2 texSize;varying vec2 texCoord;float pattern(){float s=sin(angle),c=cos(angle);vec2 tex=texCoord*texSize-center;vec2 point=vec2(c*tex.x-s*tex.y,s*tex.x+c*tex.y)*scale;return(sin(point.x)*sin(point.y))*4.0;}void main(){vec4 color=texture2D(texture,texCoord);float average=(color.r+color.g+color.b)/3.0;gl_FragColor=vec4(vec3(average*10.0-5.0+pattern()),color.a);}");
m.call(this,a.dotScreen,{center:[b,c],angle:d,scale:Math.PI/e,texSize:[this.width,this.height]});return this}function Z(b){a.edgeWork1=a.edgeWork1||new l(null,"uniform sampler2D texture;uniform vec2 delta;varying vec2 texCoord;"+q+"void main(){vec2 color=vec2(0.0);vec2 total=vec2(0.0);float offset=random(vec3(12.9898,78.233,151.7182),0.0);for(float t=-30.0;t<=30.0;t++){float percent=(t+offset-0.5)/30.0;float weight=1.0-abs(percent);vec3 sample=texture2D(texture,texCoord+delta*percent).rgb;float average=(sample.r+sample.g+sample.b)/3.0;color.x+=average*weight;total.x+=weight;if(abs(t)<15.0){weight=weight*2.0-1.0;color.y+=average*weight;total.y+=weight;}}gl_FragColor=vec4(color/total,0.0,1.0);}");
a.edgeWork2=a.edgeWork2||new l(null,"uniform sampler2D texture;uniform vec2 delta;varying vec2 texCoord;"+q+"void main(){vec2 color=vec2(0.0);vec2 total=vec2(0.0);float offset=random(vec3(12.9898,78.233,151.7182),0.0);for(float t=-30.0;t<=30.0;t++){float percent=(t+offset-0.5)/30.0;float weight=1.0-abs(percent);vec2 sample=texture2D(texture,texCoord+delta*percent).xy;color.x+=sample.x*weight;total.x+=weight;if(abs(t)<15.0){weight=weight*2.0-1.0;color.y+=sample.y*weight;total.y+=weight;}}float c=clamp(10000.0*(color.y/total.y-color.x/total.x)+0.5,0.0,1.0);gl_FragColor=vec4(c,c,c,1.0);}");
m.call(this,a.edgeWork1,{delta:[b/this.width,0]});m.call(this,a.edgeWork2,{delta:[0,b/this.height]});return this}function $(b,c,d){a.hexagonalPixelate=a.hexagonalPixelate||new l(null,"uniform sampler2D texture;uniform vec2 center;uniform float scale;uniform vec2 texSize;varying vec2 texCoord;void main(){vec2 tex=(texCoord*texSize-center)/scale;tex.y/=0.866025404;tex.x-=tex.y*0.5;vec2 a;if(tex.x+tex.y-floor(tex.x)-floor(tex.y)<1.0)a=vec2(floor(tex.x),floor(tex.y));else a=vec2(ceil(tex.x),ceil(tex.y));vec2 b=vec2(ceil(tex.x),floor(tex.y));vec2 c=vec2(floor(tex.x),ceil(tex.y));vec3 TEX=vec3(tex.x,tex.y,1.0-tex.x-tex.y);vec3 A=vec3(a.x,a.y,1.0-a.x-a.y);vec3 B=vec3(b.x,b.y,1.0-b.x-b.y);vec3 C=vec3(c.x,c.y,1.0-c.x-c.y);float alen=length(TEX-A);float blen=length(TEX-B);float clen=length(TEX-C);vec2 choice;if(alen<blen){if(alen<clen)choice=a;else choice=c;}else{if(blen<clen)choice=b;else choice=c;}choice.x+=choice.y*0.5;choice.y*=0.866025404;choice*=scale/texSize;gl_FragColor=texture2D(texture,choice+center/texSize);}");
m.call(this,a.hexagonalPixelate,{center:[b,c],scale:d,texSize:[this.width,this.height]});return this}function aa(b){a.ink=a.ink||new l(null,"uniform sampler2D texture;uniform float strength;uniform vec2 texSize;varying vec2 texCoord;void main(){vec2 dx=vec2(1.0/texSize.x,0.0);vec2 dy=vec2(0.0,1.0/texSize.y);vec4 color=texture2D(texture,texCoord);float bigTotal=0.0;float smallTotal=0.0;vec3 bigAverage=vec3(0.0);vec3 smallAverage=vec3(0.0);for(float x=-2.0;x<=2.0;x+=1.0){for(float y=-2.0;y<=2.0;y+=1.0){vec3 sample=texture2D(texture,texCoord+dx*x+dy*y).rgb;bigAverage+=sample;bigTotal+=1.0;if(abs(x)+abs(y)<2.0){smallAverage+=sample;smallTotal+=1.0;}}}vec3 edge=max(vec3(0.0),bigAverage/bigTotal-smallAverage/smallTotal);gl_FragColor=vec4(color.rgb-dot(edge,edge)*strength*100000.0,color.a);}");
m.call(this,a.ink,{strength:b*b*b*b*b,texSize:[this.width,this.height]});return this}function ba(b,c,d,e){a.bulgePinch=a.bulgePinch||t("uniform float radius;uniform float strength;uniform vec2 center;","coord-=center;float distance=length(coord);if(distance<radius){float percent=distance/radius;if(strength>0.0){coord*=mix(1.0,smoothstep(0.0,radius/distance,percent),strength*0.75);}else{coord*=mix(1.0,pow(percent,1.0+strength*0.75)*radius/distance,1.0-percent);}}coord+=center;");
m.call(this,a.bulgePinch,{radius:d,strength:n(-1,e,1),center:[b,c],texSize:[this.width,this.height]});return this}function ca(b,c,d){a.matrixWarp=a.matrixWarp||t("uniform mat3 matrix;uniform bool useTextureSpace;","if(useTextureSpace)coord=coord/texSize*2.0-1.0;vec3 warp=matrix*vec3(coord,1.0);coord=warp.xy/warp.z;if(useTextureSpace)coord=(coord*0.5+0.5)*texSize;");b=Array.prototype.concat.apply([],b);if(b.length==
4)b=[b[0],b[1],0,b[2],b[3],0,0,0,1];else if(b.length!=9)throw"can only warp with 2x2 or 3x3 matrix";m.call(this,a.matrixWarp,{matrix:c?A(b):b,texSize:[this.width,this.height],useTextureSpace:d|0});return this}function da(b,c){var d=x.apply(null,c),e=x.apply(null,b);return this.matrixWarp(J(A(d),e))}function ea(b,c,d,e){a.swirl=a.swirl||t("uniform float radius;uniform float angle;uniform vec2 center;","coord-=center;float distance=length(coord);if(distance<radius){float percent=(radius-distance)/radius;float theta=percent*percent*angle;float s=sin(theta);float c=cos(theta);coord=vec2(coord.x*c-coord.y*s,coord.x*s+coord.y*c);}coord+=center;");
m.call(this,a.swirl,{radius:d,center:[b,c],angle:e,texSize:[this.width,this.height]});return this}var u={},a;u.canvas=function(){var b=document.createElement("canvas");try{a=b.getContext("experimental-webgl",{premultipliedAlpha:false})}catch(c){a=null}if(!a)throw"This browser does not support WebGL";b._={gl:a,isInitialized:false,texture:null,spareTexture:null,flippedShader:null};b.texture=k(C);b.draw=k(E);b.update=k(F);b.replace=k(G);b.contents=k(H);b.getPixelArray=k(w);b.toDataURL=k(I);b.brightnessContrast=
k(K);b.hexagonalPixelate=k($);b.hueSaturation=k(N);b.colorHalftone=k(X);b.triangleBlur=k(V);b.unsharpMask=k(Q);b.perspective=k(da);b.matrixWarp=k(ca);b.bulgePinch=k(ba);b.tiltShift=k(U);b.dotScreen=k(Y);b.edgeWork=k(Z);b.lensBlur=k(T);b.zoomBlur=k(W);b.noise=k(O);b.denoise=k(M);b.curves=k(L);b.swirl=k(ea);b.ink=k(aa);b.vignette=k(S);b.vibrance=k(R);b.sepia=k(P);return b};u.splineInterpolate=s;var l=function(){function b(f,g){var h=a.createShader(f);a.shaderSource(h,g);a.compileShader(h);if(!a.getShaderParameter(h,
a.COMPILE_STATUS))throw"compile error: "+a.getShaderInfoLog(h);return h}function c(f,g){this.texCoordAttribute=this.vertexAttribute=null;this.program=a.createProgram();f=f||d;g=g||e;g="precision highp float;"+g;a.attachShader(this.program,b(a.VERTEX_SHADER,f));a.attachShader(this.program,b(a.FRAGMENT_SHADER,g));a.linkProgram(this.program);if(!a.getProgramParameter(this.program,a.LINK_STATUS))throw"link error: "+a.getProgramInfoLog(this.program);}var d="attribute vec2 vertex;attribute vec2 _texCoord;varying vec2 texCoord;void main(){texCoord=_texCoord;gl_Position=vec4(vertex*2.0-1.0,0.0,1.0);}",
e="uniform sampler2D texture;varying vec2 texCoord;void main(){gl_FragColor=texture2D(texture,texCoord);}";c.prototype.destroy=function(){a.deleteProgram(this.program);this.program=null};c.prototype.uniforms=function(f){a.useProgram(this.program);for(var g in f)if(f.hasOwnProperty(g)){var h=a.getUniformLocation(this.program,g);if(h!==null){var i=f[g];if(Object.prototype.toString.call(i)=="[object Array]")switch(i.length){case 1:a.uniform1fv(h,new Float32Array(i));break;
case 2:a.uniform2fv(h,new Float32Array(i));break;case 3:a.uniform3fv(h,new Float32Array(i));break;case 4:a.uniform4fv(h,new Float32Array(i));break;case 9:a.uniformMatrix3fv(h,false,new Float32Array(i));break;case 16:a.uniformMatrix4fv(h,false,new Float32Array(i));break;default:throw"dont't know how to load uniform \""+g+'" of length '+i.length;}else if(Object.prototype.toString.call(i)=="[object Number]")a.uniform1f(h,i);else throw'attempted to set uniform "'+g+'" to invalid value '+(i||"undefined").toString();
}}return this};c.prototype.textures=function(f){a.useProgram(this.program);for(var g in f)f.hasOwnProperty(g)&&a.uniform1i(a.getUniformLocation(this.program,g),f[g]);return this};c.prototype.drawRect=function(f,g,h,i){var j=a.getParameter(a.VIEWPORT);g=g!==void 0?(g-j[1])/j[3]:0;f=f!==void 0?(f-j[0])/j[2]:0;h=h!==void 0?(h-j[0])/j[2]:1;i=i!==void 0?(i-j[1])/j[3]:1;if(a.vertexBuffer==null)a.vertexBuffer=a.createBuffer();a.bindBuffer(a.ARRAY_BUFFER,a.vertexBuffer);a.bufferData(a.ARRAY_BUFFER,new Float32Array([f,
g,f,i,h,g,h,i]),a.STATIC_DRAW);if(a.texCoordBuffer==null){a.texCoordBuffer=a.createBuffer();a.bindBuffer(a.ARRAY_BUFFER,a.texCoordBuffer);a.bufferData(a.ARRAY_BUFFER,new Float32Array([0,0,0,1,1,0,1,1]),a.STATIC_DRAW)}if(this.vertexAttribute==null){this.vertexAttribute=a.getAttribLocation(this.program,"vertex");a.enableVertexAttribArray(this.vertexAttribute)}if(this.texCoordAttribute==null){this.texCoordAttribute=a.getAttribLocation(this.program,"_texCoord");a.enableVertexAttribArray(this.texCoordAttribute)}a.useProgram(this.program);
a.bindBuffer(a.ARRAY_BUFFER,a.vertexBuffer);a.vertexAttribPointer(this.vertexAttribute,2,a.FLOAT,false,0,0);a.bindBuffer(a.ARRAY_BUFFER,a.texCoordBuffer);a.vertexAttribPointer(this.texCoordAttribute,2,a.FLOAT,false,0,0);a.drawArrays(a.TRIANGLE_STRIP,0,4)};c.getDefaultShader=function(){a.defaultShader=a.defaultShader||new c;return a.defaultShader};return c}();B.prototype.interpolate=function(b){for(var c=0,d=this.ya.length-1;d-c>1;){var e=d+c>>1;if(this.xa[e]>b)d=e;else c=e}e=this.xa[d]-this.xa[c];
var f=(this.xa[d]-b)/e;b=(b-this.xa[c])/e;return f*this.ya[c]+b*this.ya[d]+((f*f*f-f)*this.y2[c]+(b*b*b-b)*this.y2[d])*e*e/6};var r=function(){function b(e,f,g,h){this.id=a.createTexture();this.width=e;this.height=f;this.format=g;this.type=h;a.bindTexture(a.TEXTURE_2D,this.id);a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MAG_FILTER,a.LINEAR);a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MIN_FILTER,a.LINEAR);a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_S,a.CLAMP_TO_EDGE);a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_T,
a.CLAMP_TO_EDGE);e&&f&&a.texImage2D(a.TEXTURE_2D,0,this.format,e,f,0,this.format,this.type,null)}function c(e){if(d==null)d=document.createElement("canvas");d.width=e.width;d.height=e.height;e=d.getContext("2d");e.clearRect(0,0,d.width,d.height);return e}b.fromElement=function(e){var f=new b(0,0,a.RGBA,a.UNSIGNED_BYTE);f.loadContentsOf(e);return f};b.prototype.loadContentsOf=function(e){this.width=e.width||e.videoWidth;this.height=e.height||e.videoHeight;a.bindTexture(a.TEXTURE_2D,this.id);a.texImage2D(a.TEXTURE_2D,
0,this.format,this.format,this.type,e)};b.prototype.initFromBytes=function(e,f,g){this.width=e;this.height=f;this.format=a.RGBA;this.type=a.UNSIGNED_BYTE;a.bindTexture(a.TEXTURE_2D,this.id);a.texImage2D(a.TEXTURE_2D,0,a.RGBA,e,f,0,a.RGBA,this.type,new Uint8Array(g))};b.prototype.destroy=function(){a.deleteTexture(this.id);this.id=null};b.prototype.use=function(e){a.activeTexture(a.TEXTURE0+(e||0));a.bindTexture(a.TEXTURE_2D,this.id)};b.prototype.unuse=function(e){a.activeTexture(a.TEXTURE0+(e||0));
a.bindTexture(a.TEXTURE_2D,null)};b.prototype.ensureFormat=function(e,f,g,h){if(arguments.length==1){var i=arguments[0];e=i.width;f=i.height;g=i.format;h=i.type}if(e!=this.width||f!=this.height||g!=this.format||h!=this.type){this.width=e;this.height=f;this.format=g;this.type=h;a.bindTexture(a.TEXTURE_2D,this.id);a.texImage2D(a.TEXTURE_2D,0,this.format,e,f,0,this.format,this.type,null)}};b.prototype.drawTo=function(e){a.framebuffer=a.framebuffer||a.createFramebuffer();a.bindFramebuffer(a.FRAMEBUFFER,
a.framebuffer);a.framebufferTexture2D(a.FRAMEBUFFER,a.COLOR_ATTACHMENT0,a.TEXTURE_2D,this.id,0);a.viewport(0,0,this.width,this.height);e();a.bindFramebuffer(a.FRAMEBUFFER,null)};var d=null;b.prototype.fillUsingCanvas=function(e){e(c(this));this.format=a.RGBA;this.type=a.UNSIGNED_BYTE;a.bindTexture(a.TEXTURE_2D,this.id);a.texImage2D(a.TEXTURE_2D,0,a.RGBA,a.RGBA,a.UNSIGNED_BYTE,d);return this};b.prototype.toImage=function(e){this.use();l.getDefaultShader().drawRect();var f=this.width*this.height*4,
g=new Uint8Array(f),h=c(this),i=h.createImageData(this.width,this.height);a.readPixels(0,0,this.width,this.height,a.RGBA,a.UNSIGNED_BYTE,g);for(var j=0;j<f;j++)i.data[j]=g[j];h.putImageData(i,0,0);e.src=d.toDataURL()};b.prototype.swapWith=function(e){var f;f=e.id;e.id=this.id;this.id=f;f=e.width;e.width=this.width;this.width=f;f=e.height;e.height=this.height;this.height=f;f=e.format;e.format=this.format;this.format=f};return b}(),q="float random(vec3 scale,float seed){return fract(sin(dot(gl_FragCoord.xyz+seed,scale))*43758.5453+seed);}";
return u}();


imagelib.drawing = {};

imagelib.drawing.context = function(size) {
  var canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  canvas.style.setProperty('image-rendering', 'optimizeQuality', null);
  return canvas.getContext('2d');
};

imagelib.drawing.copy = function(dstCtx, src, size) {
  dstCtx.imageSmoothingEnabled = false; // JG
  dstCtx.drawImage(src.canvas || src, 0, 0, size.w, size.h);
};

imagelib.drawing.clear = function(ctx, size) {
  ctx.clearRect(0, 0, size.w, size.h);
};

imagelib.drawing.drawCenterInside = function(dstCtx, src, dstRect, srcRect) {
  if (srcRect.w / srcRect.h > dstRect.w / dstRect.h) {
    var h = srcRect.h * dstRect.w / srcRect.w;
     imagelib.drawing.drawImageScaled(dstCtx, src,
        srcRect.x, srcRect.y,
        srcRect.w, srcRect.h,
        dstRect.x, dstRect.y + (dstRect.h - h) / 2,
        dstRect.w, h);
  } else {
    var w = srcRect.w * dstRect.h / srcRect.h;
     imagelib.drawing.drawImageScaled(dstCtx, src,
        srcRect.x, srcRect.y,
        srcRect.w, srcRect.h,
        dstRect.x + (dstRect.w - w) / 2, dstRect.y,
        w, dstRect.h);
  }
};

imagelib.drawing.drawCenterCrop = function(dstCtx, src, dstRect, srcRect) {
  if (srcRect.w / srcRect.h > dstRect.w / dstRect.h) {
    var w = srcRect.h * dstRect.w / dstRect.h;
    imagelib.drawing.drawImageScaled(dstCtx, src,
        srcRect.x + (srcRect.w - w) / 2, srcRect.y,
        w, srcRect.h,
        dstRect.x, dstRect.y,
        dstRect.w, dstRect.h);
  } else {
    var h = srcRect.w * dstRect.h / dstRect.w;
    imagelib.drawing.drawImageScaled(dstCtx, src,
        srcRect.x, srcRect.y + (srcRect.h - h) / 2,
        srcRect.w, h,
        dstRect.x, dstRect.y,
        dstRect.w, dstRect.h);
  }
};

imagelib.drawing.drawImageScaled = function(dstCtx, src, sx, sy, sw, sh, dx, dy, dw, dh) {
  if ((dw < sw && dh < sh) && imagelib.ALLOW_MANUAL_RESCALE) {
    sx = Math.floor(sx);
    sy = Math.floor(sy);
    sw =  Math.ceil(sw);
    sh =  Math.ceil(sh);
    dx = Math.floor(dx);
    dy = Math.floor(dy);
    dw =  Math.ceil(dw);
    dh =  Math.ceil(dh);

    // scaling down, use an averaging algorithm since canvas.drawImage doesn't do a good
    // job in all browsers.
    var tmpCtx = imagelib.drawing.context({ w: sw, h: sh });
    tmpCtx.drawImage(src.canvas || src, 0, 0);
    var srcData = tmpCtx.getImageData(0, 0, sw, sh);

    var outCtx = imagelib.drawing.context({ w: dw, h: dh });
    var outData = outCtx.createImageData(dw, dh);

    var tr, tg, tb, ta; // R/G/B/A totals
    var numOpaquePixels;
    var numPixels;

    for (var y = 0; y < dh; y++) {
      for (var x = 0; x < dw; x++) {
        tr = tg = tb = ta = 0;
        numOpaquePixels = numPixels = 0;

        // Average the relevant region from source image
        for (var j = Math.floor(y * sh / dh); j < (y + 1) * sh / dh; j++) {
          for (var i = Math.floor(x * sw / dw); i < (x + 1) * sw / dw; i++) {
            ++numPixels;
            ta += srcData.data[(j * sw + i) * 4 + 3];
            if (srcData.data[(j * sw + i) * 4 + 3] == 0) {
              // disregard transparent pixels when computing average for R/G/B
              continue;
            }
            ++numOpaquePixels;
            tr += srcData.data[(j * sw + i) * 4 + 0];
            tg += srcData.data[(j * sw + i) * 4 + 1];
            tb += srcData.data[(j * sw + i) * 4 + 2];
          }
        }

        outData.data[(y * dw + x) * 4 + 0] = tr / numOpaquePixels;
        outData.data[(y * dw + x) * 4 + 1] = tg / numOpaquePixels;
        outData.data[(y * dw + x) * 4 + 2] = tb / numOpaquePixels;
        outData.data[(y * dw + x) * 4 + 3] = ta / numPixels;
      }
    }

    outCtx.putImageData(outData, 0, 0);
    dstCtx.drawImage(outCtx.canvas, dx, dy);

  } else {
    // scaling up, use canvas.drawImage
    dstCtx.drawImage(src.canvas || src, sx, sy, sw, sh, dx, dy, dw, dh);
  }
};

imagelib.drawing.trimRectWorkerJS_ = [
"self['onmessage'] = function(event) {                                       ",
"  var l = event.data.size.w, t = event.data.size.h, r = 0, b = 0;           ",
"                                                                            ",
"  var alpha;                                                                ",
"  for (var y = 0; y < event.data.size.h; y++) {                             ",
"    for (var x = 0; x < event.data.size.w; x++) {                           ",
"      alpha = event.data.imageData.data[                                    ",
"          ((y * event.data.size.w + x) << 2) + 3];                          ",
"      if (alpha >= event.data.minAlpha) {                                   ",
"        l = Math.min(x, l);                                                 ",
"        t = Math.min(y, t);                                                 ",
"        r = Math.max(x, r);                                                 ",
"        b = Math.max(y, b);                                                 ",
"      }                                                                     ",
"    }                                                                       ",
"  }                                                                         ",
"                                                                            ",
"  if (l > r) {                                                              ",
"    // no pixels, couldn't trim                                             ",
"    postMessage({ x: 0, y: 0, w: event.data.size.w, h: event.data.size.h });",
"    return;                                                                 ",
"  }                                                                         ",
"                                                                            ",
"  postMessage({ x: l, y: t, w: r - l + 1, h: b - t + 1 });                  ",
"};                                                                          ",
""].join('\n');

imagelib.drawing.getTrimRect = function(ctx, size, minAlpha, callback) {
  callback = callback || function(){};

  if (!ctx.canvas) {
    // Likely an image
    var src = ctx;
    ctx = imagelib.drawing.context(size);
    imagelib.drawing.copy(ctx, src, size);
  }

  if (minAlpha == 0)
    callback({ x: 0, y: 0, w: size.w, h: size.h });

  minAlpha = minAlpha || 1;

  var worker = imagelib.util.runWorkerJs(
      imagelib.drawing.trimRectWorkerJS_,
      {
        imageData: ctx.getImageData(0, 0, size.w, size.h),
        size: size,
        minAlpha: minAlpha
      },
      callback);

  return worker;
};

imagelib.drawing.getCenterOfMass = function(ctx, size, minAlpha, callback) {
  callback = callback || function(){};

  if (!ctx.canvas) {
    // Likely an image
    var src = ctx;
    ctx = imagelib.drawing.context(size);
    imagelib.drawing.copy(ctx, src, size);
  }

  if (minAlpha == 0)
    callback({ x: size.w / 2, y: size.h / 2 });

  minAlpha = minAlpha || 1;

  var l = size.w, t = size.h, r = 0, b = 0;
  var imageData = ctx.getImageData(0, 0, size.w, size.h);

  var sumX = 0;
  var sumY = 0;
  var n = 0; // number of pixels > minAlpha
  var alpha;
  for (var y = 0; y < size.h; y++) {
    for (var x = 0; x < size.w; x++) {
      alpha = imageData.data[((y * size.w + x) << 2) + 3];
      if (alpha >= minAlpha) {
        sumX += x;
        sumY += y;
        ++n;
      }
    }
  }

  if (n <= 0) {
    // no pixels > minAlpha, just use center
    callback({ x: size.w / 2, h: size.h / 2 });
  }

  callback({ x: Math.round(sumX / n), y: Math.round(sumY / n) });
};

imagelib.drawing.copyAsAlpha = function(dstCtx, src, size, onColor, offColor) {
  onColor = onColor || '#fff';
  offColor = offColor || '#000';

  dstCtx.save();
  dstCtx.clearRect(0, 0, size.w, size.h);
  dstCtx.globalCompositeOperation = 'source-over';
  imagelib.drawing.copy(dstCtx, src, size);
  dstCtx.globalCompositeOperation = 'source-atop';
  dstCtx.fillStyle = onColor;
  dstCtx.fillRect(0, 0, size.w, size.h);
  dstCtx.globalCompositeOperation = 'destination-atop';
  dstCtx.fillStyle = offColor;
  dstCtx.fillRect(0, 0, size.w, size.h);
  dstCtx.restore();
};

imagelib.drawing.makeAlphaMask = function(ctx, size, fillColor) {
  var src = ctx.getImageData(0, 0, size.w, size.h);
  var dst = ctx.createImageData(size.w, size.h);
  var srcData = src.data;
  var dstData = dst.data;
  var i, g;
  for (var y = 0; y < size.h; y++) {
    for (var x = 0; x < size.w; x++) {
      i = (y * size.w + x) << 2;
      g = 0.30 * srcData[i] +
              0.59 * srcData[i + 1] +
              0.11 * srcData[i + 2];
      dstData[i] = dstData[i + 1] = dstData[i + 2] = 255;
      dstData[i + 3] = g;
    }
  }
  ctx.putImageData(dst, 0, 0);

  if (fillColor) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = fillColor;
    ctx.fillRect(0, 0, size.w, size.h);
    ctx.restore();
  }
};

imagelib.drawing.applyFilter = function(filter, ctx, size) {
  var src = ctx.getImageData(0, 0, size.w, size.h);
  var dst = ctx.createImageData(size.w, size.h);
  filter.apply(src, dst);
  ctx.putImageData(dst, 0, 0);
};

(function() {
  function slowblur_(radius, ctx, size) {
    var rows = Math.ceil(radius);
    var r = rows * 2 + 1;
    var matrix = new Array(r * r);
    var sigma = radius / 3;
    var sigma22 = 2 * sigma * sigma;
    var sqrtPiSigma22 = Math.sqrt(Math.PI * sigma22);
    var radius2 = radius * radius;
    var total = 0;
    var index = 0;
    var distance2;
    for (var y = -rows; y <= rows; y++) {
      for (var x = -rows; x <= rows; x++) {
        distance2 = 1.0*x*x + 1.0*y*y;
        if (distance2 > radius2)
          matrix[index] = 0;
        else
          matrix[index] = Math.exp(-distance2 / sigma22) / sqrtPiSigma22;
        total += matrix[index];
        index++;
      }
    }

    imagelib.drawing.applyFilter(
        new ConvolutionFilter(matrix, total, 0, true),
        ctx, size);
  }

  function glfxblur_(radius, ctx, size) {
    var canvas = fx.canvas();
    var texture = canvas.texture(ctx.canvas);
    canvas.draw(texture).triangleBlur(radius).update();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(canvas, 0, 0);
  }

  imagelib.drawing.blur = function(radius, ctx, size) {
    try {
      if (size.w > 128 || size.h > 128) {
        glfxblur_(radius, ctx, size);
      } else {
        slowblur_(radius, ctx, size);
      }

    } catch (e) {
      // WebGL unavailable, use the slower blur
      slowblur_(radius, ctx, size);
    }
  };
})();

imagelib.drawing.fx = function(effects, dstCtx, src, size) {
  effects = effects || [];

  var outerEffects = [];
  var innerEffects = [];
  var fillEffects = [];

  for (var i = 0; i < effects.length; i++) {
    if (/^outer/.test(effects[i].effect)) outerEffects.push(effects[i]);
    else if (/^inner/.test(effects[i].effect)) innerEffects.push(effects[i]);
    else if (/^fill/.test(effects[i].effect)) fillEffects.push(effects[i]);
  }

  var padLeft = 0, padTop, padRight, padBottom;
  var paddedSize;
  var tmpCtx, tmpCtx2;

  // Render outer effects
  for (var i = 0; i < outerEffects.length; i++) {
    padLeft = Math.max(padLeft, outerEffects[i].blur || 0); // blur radius
  }
  padTop = padRight = padBottom = padLeft;

  paddedSize = {
    w: size.w + padLeft + padRight,
    h: size.h + padTop + padBottom
  };

  tmpCtx = imagelib.drawing.context(paddedSize);

  for (var i = 0; i < outerEffects.length; i++) {
    var effect = outerEffects[i];

    dstCtx.save(); // D1
    tmpCtx.save(); // T1

    switch (effect.effect) {
      case 'outer-shadow':
        // The below method (faster) fails in Safari and other browsers, for some reason. Likely
        // something to do with the source-atop blending mode.
        // TODO: investigate why it fails in Safari

        // imagelib.drawing.clear(tmpCtx, size);
        // imagelib.drawing.copy(tmpCtx, src.canvas || src, size);
        // if (effect.blur)
        //   imagelib.drawing.blur(effect.blur, tmpCtx, size);
        // tmpCtx.globalCompositeOperation = 'source-atop';
        // tmpCtx.fillStyle = effect.color || '#000';
        // tmpCtx.fillRect(0, 0, size.w, size.h);
        // if (effect.translate)
        //   dstCtx.translate(effect.translate.x || 0, effect.translate.y || 0);
        // 
        // dstCtx.globalAlpha = Math.max(0, Math.min(1, effect.opacity || 1));
        // imagelib.drawing.copy(dstCtx, tmpCtx, size);

        imagelib.drawing.clear(tmpCtx, paddedSize);

        tmpCtx.save(); // T2
        tmpCtx.translate(padLeft, padTop);
        imagelib.drawing.copyAsAlpha(tmpCtx, src.canvas || src, size);
        tmpCtx.restore(); // T2

        if (effect.blur)
          imagelib.drawing.blur(effect.blur, tmpCtx, paddedSize);

        imagelib.drawing.makeAlphaMask(tmpCtx, paddedSize, effect.color || '#000');
        if (effect.translate)
          dstCtx.translate(effect.translate.x || 0, effect.translate.y || 0);

        dstCtx.globalAlpha = Math.max(0, Math.min(1, effect.opacity || 1));
        dstCtx.translate(-padLeft, -padTop);
        imagelib.drawing.copy(dstCtx, tmpCtx, paddedSize);
        break;
    }

    dstCtx.restore(); // D1
    tmpCtx.restore(); // T1
  }

  dstCtx.save(); // D1

  // Render object with optional fill effects (only take first fill effect)
  tmpCtx = imagelib.drawing.context(size);

  imagelib.drawing.clear(tmpCtx, size);
  imagelib.drawing.copy(tmpCtx, src.canvas || src, size);
  var fillOpacity = 1.0;

  if (fillEffects.length) {
    var effect = fillEffects[0];

    tmpCtx.save(); // T1
    tmpCtx.globalCompositeOperation = 'source-atop';

    switch (effect.effect) {
      case 'fill-color':
        tmpCtx.fillStyle = effect.color;
        break;

      case 'fill-lineargradient':
        var gradient = tmpCtx.createLinearGradient(
            effect.from.x, effect.from.y, effect.to.x, effect.to.y);
        for (var i = 0; i < effect.colors.length; i++) {
          gradient.addColorStop(effect.colors[i].offset, effect.colors[i].color);
        }
        tmpCtx.fillStyle = gradient;
        break;
    }

    fillOpacity = Math.max(0, Math.min(1, effect.opacity || 1));

    tmpCtx.fillRect(0, 0, size.w, size.h);
    tmpCtx.restore(); // T1
  }

  dstCtx.globalAlpha = fillOpacity;
  imagelib.drawing.copy(dstCtx, tmpCtx, size);
  dstCtx.globalAlpha = 1.0;

  // Render inner effects
  var translate;
  padLeft = padTop = padRight = padBottom = 0;
  for (var i = 0; i < innerEffects.length; i++) {
    translate = effect.translate || {};
    padLeft   = Math.max(padLeft,   (innerEffects[i].blur || 0) + Math.max(0,  translate.x || 0));
    padTop    = Math.max(padTop,    (innerEffects[i].blur || 0) + Math.max(0,  translate.y || 0));
    padRight  = Math.max(padRight,  (innerEffects[i].blur || 0) + Math.max(0, -translate.x || 0));
    padBottom = Math.max(padBottom, (innerEffects[i].blur || 0) + Math.max(0, -translate.y || 0));
  }

  paddedSize = {
    w: size.w + padLeft + padRight,
    h: size.h + padTop + padBottom
  };

  tmpCtx = imagelib.drawing.context(paddedSize);
  tmpCtx2 = imagelib.drawing.context(paddedSize);

  for (var i = 0; i < innerEffects.length; i++) {
    var effect = innerEffects[i];

    dstCtx.save(); // D2
    tmpCtx.save(); // T1

    switch (effect.effect) {
      case 'inner-shadow':
        imagelib.drawing.clear(tmpCtx, paddedSize);

        tmpCtx.save(); // T2
        tmpCtx.translate(padLeft, padTop);
        imagelib.drawing.copyAsAlpha(tmpCtx, src.canvas || src, size, '#fff', '#000');
        tmpCtx.restore(); // T2

        tmpCtx2.save(); // T2
        tmpCtx2.translate(padLeft, padTop);
        imagelib.drawing.copyAsAlpha(tmpCtx2, src.canvas || src, size);
        tmpCtx2.restore(); // T2

        if (effect.blur)
          imagelib.drawing.blur(effect.blur, tmpCtx2, paddedSize);
        imagelib.drawing.makeAlphaMask(tmpCtx2, paddedSize, '#000');
        if (effect.translate)
          tmpCtx.translate(effect.translate.x || 0, effect.translate.y || 0);

        tmpCtx.globalCompositeOperation = 'source-over';
        imagelib.drawing.copy(tmpCtx, tmpCtx2, paddedSize);

        imagelib.drawing.makeAlphaMask(tmpCtx, paddedSize, effect.color);
        dstCtx.globalAlpha = Math.max(0, Math.min(1, effect.opacity || 1));
        dstCtx.translate(-padLeft, -padTop);
        imagelib.drawing.copy(dstCtx, tmpCtx, paddedSize);
        break;
    }

    tmpCtx.restore(); // T1
    dstCtx.restore(); // D2
  }

  dstCtx.restore(); // D1
};

imagelib.loadImageResources = function(images, callback) {
  var imageResources = {};

  var checkForCompletion = function() {
    for (var id in images) {
      if (!(id in imageResources))
        return;
    }
    (callback || function(){})(imageResources);
    callback = null;
  };

  for (var id in images) {
    var img = document.createElement('img');
    img.src = images[id];
    (function(img, id) {
      img.onload = function() {
        imageResources[id] = img;
        checkForCompletion();
      };
      img.onerror = function() {
        imageResources[id] = null;
        checkForCompletion();
      }
    })(img, id);
  }
};

imagelib.loadFromUri = function(uri, callback) {
  callback = callback || function(){};

  var img = document.createElement('img');
  img.src = uri;
  img.onload = function() {
    callback(img);
  };
  img.onerror = function() {
    callback(null);
  }
};

imagelib.toDataUri = function(img) {
  var canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  var ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  return canvas.toDataURL();
};


imagelib.loadXmlTemplates = function(files, callback) {
	var fileResources = {};

	var checkForCompletion = function() {
		for(var id in files) {
			if(!( id in fileResources)) {
				return;
			}
		}
		//console.log('callback');
		(callback || function() {})(fileResources);
		callback = null;
	};

	for(var id in files) {
		(function(id) {
			$.get(files[id], function(data) {
				fileResources[id] = data;
				checkForCompletion();
			}, 'html');
		})(id);
	}
}

imagelib.util = {};

/**
 * Helper method for running inline Web Workers, if the browser can support
 * them. If the browser doesn't support inline Web Workers, run the script
 * on the main thread, with this function body's scope, using eval. Browsers
 * must provide BlobBuilder, URL.createObjectURL, and Worker support to use
 * inline Web Workers. Most features such as importScripts() are not
 * currently supported, so this only works for basic workers.
 * @param {String} js The inline Web Worker Javascript code to run. This code
 *     must use 'self' and not 'this' as the global context variable.
 * @param {Object} params The parameters object to pass to the worker.
 *     Equivalent to calling Worker.postMessage(params);
 * @param {Function} callback The callback to run when the worker calls
 *     postMessage. Equivalent to adding a 'message' event listener on a
 *     Worker object and running callback(event.data);
 */
imagelib.util.runWorkerJs = function(js, params, callback) {
  var BlobBuilder = (window.BlobBuilder || window.WebKitBlobBuilder);
  var URL = (window.URL || window.webkitURL);
  var Worker = window.Worker;

  if (URL && BlobBuilder && Worker) {
    // BlobBuilder, Worker, and window.URL.createObjectURL are all available,
    // so we can use inline workers.
    var bb = new BlobBuilder();
    bb.append(js);
    var worker = new Worker(URL.createObjectURL(bb.getBlob()));
    worker.onmessage = function(event) {
      callback(event.data);
    };
    worker.postMessage(params);
    return worker;

  } else {
    // We can't use inline workers, so run the worker JS on the main thread.
    (function() {
      var __DUMMY_OBJECT__ = {};
      // Proxy to Worker.onmessage
      var postMessage = function(result) {
        callback(result);
      };
      // Bind the worker to this dummy object. The worker will run
      // in this scope.
      eval('var self=__DUMMY_OBJECT__;\n' + js);
      // Proxy to Worker.postMessage
      __DUMMY_OBJECT__.onmessage({
        data: params
      });
    })();

    // Return a dummy Worker.
    return {
      terminate: function(){}
    };
  }
};

// https://github.com/gildas-lormeau/zip.js/issues/17#issuecomment-8513258
// thanks Eric!
imagelib.util.hasBlobConstructor = function() {
  try {
    return !!new Blob();
  } catch(e) {
    return false;
  }
};

window.imagelib = imagelib;

})();

(function() {

var studio = {};

studio.checkBrowser = function() {
  var chromeMatch = navigator.userAgent.match(/Chrome\/(\d+)/);
  var browserSupported = false;
  if (chromeMatch) {
    var chromeVersion = parseInt(chromeMatch[1], 10);
    if (chromeVersion >= 6) {
      browserSupported = true;
    }
  }

  if (!browserSupported) {
    $('<div>')
      .addClass('browser-unsupported-note ui-state-highlight')
      .attr('title', 'Your browser is not supported.')
      .append($('<span class="ui-icon ui-icon-alert" ' +
                'style="float:left; margin:0 7px 50px 0;">'))
      .append($('<p>')
        .html('Currently only ' +
              '<a href="http://www.google.com/chrome">Google Chrome</a> ' +
              'is recommended and supported. Your mileage may vary with ' +
              'other browsers.'))
      .prependTo('body');
  }
};

// From sample code at http://jqueryui.com/demos/autocomplete/#combobox

(function( $ ) {
  $.widget( "ui.combobox", {
    _create: function() {
      var self = this,
        select = this.element.hide(),
        selected = select.children( ":selected" ),
        value = selected.val() ? selected.text() : "";
      var input = $( "<input>" )
        .insertAfter( select )
        .val( value )
        .autocomplete({
          delay: 0,
          minLength: 0,
          source: function( request, response ) {
            var matcher = new RegExp( $.ui.autocomplete.escapeRegex(request.term), "i" );
            response( select.children( "option" ).map(function() {
              var text = $( this ).text();
              if ( this.value && ( !request.term || matcher.test(text) ) )
                return {
                  label: text.replace(
                    new RegExp(
                      "(?![^&;]+;)(?!<[^<>]*)(" +
                      $.ui.autocomplete.escapeRegex(request.term) +
                      ")(?![^<>]*>)(?![^&;]+;)", "gi"
                    ), "<strong>$1</strong>" ),
                  value: text,
                  option: this
                };
            }) );
          },
          select: function( event, ui ) {
            ui.item.option.selected = true;
            self._trigger( "selected", event, {
              item: ui.item.option
            });
          },
          change: function( event, ui ) {
            if ( !ui.item ) {
              var matcher = new RegExp( "^" + $.ui.autocomplete.escapeRegex( $(this).val() ) + "$", "i" ),
                valid = false;
              select.children( "option" ).each(function() {
                if ( this.value.match( matcher ) ) {
                  this.selected = valid = true;
                  return false;
                }
              });
              if ( !valid ) {
                // remove invalid value, as it didn't match anything
                $( this ).val( "" );
                select.val( "" );
                return false;
              }
            }
          }
        })
        .addClass( "ui-widget ui-widget-content ui-corner-left" );

      input.data( "autocomplete" )._renderItem = function( ul, item ) {
        return $( "<li></li>" )
          .data( "item.autocomplete", item )
          .append( "<a>" + item.label + "</a>" )
          .appendTo( ul );
      };

      $( "<button>&nbsp;</button>" )
        .attr( "tabIndex", -1 )
        .attr( "title", "Show All Items" )
        .insertAfter( input )
        .button({
          icons: {
            primary: "ui-icon-triangle-1-s"
          },
          text: false
        })
        .removeClass( "ui-corner-all" )
        .addClass( "ui-corner-right ui-button-icon" )
        .click(function() {
          // close if already visible
          if ( input.autocomplete( "widget" ).is( ":visible" ) ) {
            input.autocomplete( "close" );
            return;
          }

          // pass empty string as value to search for, displaying all results
          input.autocomplete( "search", "" );
          input.focus();
        });
    }
  });
})( jQuery );// Based on sample code at http://jqueryui.com/demos/autocomplete/#combobox

(function( $ ) {
  $.widget( "ui.autocompletewithbutton", {
    _create: function() {
      var self = this,
        input = this.element,
        value = input.text();

      input
        .autocomplete($.extend(this.options, {
          select: function( event, ui ) {
            self._trigger( "selected", event, ui.item.value);
          }
        }))
        .addClass( "form-text ui-widget ui-widget-content ui-corner-left " +
                   "ui-autocomplete-input" );

      input.data( "autocomplete" )._renderItem = function( ul, item ) {
        return $( "<li></li>" )
          .data( "item.autocomplete", item )
          .append( "<a>" + item.label + "</a>" )
          .appendTo( ul );
      };

      $( "<button>&nbsp;</button>" )
        .attr( "tabIndex", -1 )
        .attr( "title", "Show All Items" )
        .insertAfter( input )
        .button({
          icons: {
            primary: "ui-icon-triangle-1-s"
          },
          text: false
        })
        .removeClass( "ui-corner-all" )
        .addClass( "ui-corner-right ui-button-icon" )
        .click(function() {
          // close if already visible
          if ( input.autocomplete( "widget" ).is( ":visible" ) ) {
            input.autocomplete( "close" );
            return;
          }

          // pass empty string as value to search for, displaying all results
          input.autocomplete( "search", "" );
          input.focus();
        });
    }
  });
})( jQuery );

studio.forms = {};

/**
 * Class defining a data entry form for use in the Asset Studio.
 */
studio.forms.Form = Base.extend({
  /**
   * Creates a new form with the given parameters.
   * @constructor
   * @param {Function} [params.onChange] A function
   * @param {Array} [params.inputs] A list of inputs
   */
  constructor: function(id, params) {
    this.id_ = id;
    this.params_ = params;
    this.fields_ = params.fields;
    this.pauseNotify_ = false;

    for (var i = 0; i < this.fields_.length; i++) {
      this.fields_[i].setForm_(this);
    }

    this.onChange = this.params_.onChange || function(){};
  },

  /**
   * Creates the user interface for the form in the given container.
   * @private
   * @param {HTMLElement} container The container node for the form UI.
   */
  createUI: function(container) {
    for (var i = 0; i < this.fields_.length; i++) {
      var field = this.fields_[i];
      field.createUI(container);
    }
  },

  /**
   * Notifies that the form contents have changed;
   * @private
   */
  notifyChanged_: function(field) {
    if (this.pauseNotify_) {
      return;
    }
    this.onChange(field);
  },

  /**
   * Returns the current values of the form fields, as an object.
   * @type Object
   */
  getValues: function() {
    var values = {};

    for (var i = 0; i < this.fields_.length; i++) {
      var field = this.fields_[i];
      values[field.id_] = field.getValue();
    }

    return values;
  },

  /**
   * Returns all available serialized values of the form fields, as an object.
   * All values in the returned object are either strings or objects.
   * @type Object
   */
  getValuesSerialized: function() {
    var values = {};

    for (var i = 0; i < this.fields_.length; i++) {
      var field = this.fields_[i];
      var value = field.serializeValue ? field.serializeValue() : undefined;
      if (value !== undefined) {
        values[field.id_] = field.serializeValue();
      }
    }

    return values;
  },

  /**
   * Sets the form field values for the key/value pairs in the given object.
   * Values must be serialized forms of the form values. The form must be
   * initialized before calling this method.
   */
  setValuesSerialized: function(serializedValues) {
    this.pauseNotify_ = true;
    for (var i = 0; i < this.fields_.length; i++) {
      var field = this.fields_[i];
      if (field.id_ in serializedValues && field.deserializeValue) {
        field.deserializeValue(serializedValues[field.id_]);
      }
    }
    this.pauseNotify_ = false;
    this.notifyChanged_(null);
  }
});


/**
 * Represents a form field and its associated UI elements. This should be
 * broken out into a more MVC-like architecture in the future.
 */
studio.forms.Field = Base.extend({
  /**
   * Instantiates a new field with the given ID and parameters.
   * @constructor
   */
  constructor: function(id, params) {
    this.id_ = id;
    this.params_ = params;
  },

  /**
   * Sets the form owner of the field. Internally called by
   * {@link studio.forms.Form}.
   * @private
   * @param {studio.forms.Form} form The owner form.
   */
  setForm_: function(form) {
    this.form_ = form;
  },

  /**
   * Returns a complete ID.
   * @type String
   */
  getLongId: function() {
    return this.form_.id_ + '-' + this.id_;
  },

  /**
   * Returns the ID for the form's UI element (or container).
   * @type String
   */
  getHtmlId: function() {
    return '_frm-' + this.getLongId();
  },

  /**
   * Generates the UI elements for a form field container. Not very portable
   * outside the Asset Studio UI. Intended to be overriden by descendents.
   * @private
   * @param {HTMLElement} container The destination element to contain the
   * field.
   */
  createUI: function(container) {
    container = $(container);
    return $('<div>')
      .addClass('form-field-outer')
      .append(
        $('<label>')
          .attr('for', this.getHtmlId())
          .text(this.params_.title)
          .append($('<div>')
            .addClass('form-field-help-text')
            .css('display', this.params_.helpText ? '' : 'none')
            .html(this.params_.helpText))
      )
      .append(
        $('<div>')
          .addClass('form-field-container')
      )
      .appendTo(container);
  }
});

studio.forms.TextField = studio.forms.Field.extend({
  createUI: function(container) {
    var fieldContainer = $('.form-field-container', this.base(container));
    var me = this;

    this.el_ = $('<input>')
      .addClass('form-text ui-widget ui-widget-content ' +
                'ui-autocomplete-input ui-corner-all')
      .attr('type', 'text')
      .val(this.getValue())
      .bind('change', function() {
        me.setValue($(this).val(), true);
      })
      .bind('keydown change', function() {
        var inputEl = this;
        var oldVal = me.getValue();
        window.setTimeout(function() {
          var newVal = $(inputEl).val();
          if (oldVal != newVal) {
            me.setValue(newVal, true);
          }
        }, 0);
      })
      .appendTo(fieldContainer);
  },

  getValue: function() {
    var value = this.value_;
    if (typeof value != 'string') {
      value = this.params_.defaultValue || '';
    }
    return value;
  },

  setValue: function(val, pauseUi) {
    this.value_ = val;
    if (!pauseUi) {
      $(this.el_).val(val);
    }
    this.form_.notifyChanged_(this);
  },

  serializeValue: function() {
    return this.getValue();
  },

  deserializeValue: function(s) {
    this.setValue(s);
  }
});

studio.forms.AutocompleteTextField = studio.forms.Field.extend({
  createUI: function(container) {
    var fieldContainer = $('.form-field-container', this.base(container));
    var me = this;

    this.el_ = $('<input>')
      .attr('type', 'text')
      .val(this.getValue())
      .bind('keydown change', function() {
        var inputEl = this;
        window.setTimeout(function() {
          me.setValue($(inputEl).val(), true);
        }, 0);
      })
      .appendTo(fieldContainer);

    this.el_.autocompletewithbutton({
      source: this.params_.items || [],
      delay: 0,
      minLength: 0,
      selected: function(evt, val) {
        me.setValue(val, true);
      }
    });
  },

  getValue: function() {
    var value = this.value_;
    if (typeof value != 'string') {
      value = this.params_.defaultValue || '';
    }
    return value;
  },

  setValue: function(val, pauseUi) {
    this.value_ = val;
    if (!pauseUi) {
      $(this.el_).val(val);
    }
    this.form_.notifyChanged_(this);
  },

  serializeValue: function() {
    return this.getValue();
  },

  deserializeValue: function(s) {
    this.setValue(s);
  }
});
/*
studio.forms.ColorField = studio.forms.Field.extend({
  createUI: function(container) {
    var fieldContainer = $('.form-field-container', this.base(container));
    var me = this;
    this.el_ = $('<div>')
      .addClass('form-color')
      .attr('id', this.getHtmlId())
      .append($('<div>')
        .addClass('form-color-preview')
        .css('background-color', this.getValue().color)
      )
      .button({ label: null, icons: { secondary: 'ui-icon-carat-1-s' }})
      .appendTo(fieldContainer);

    this.el_.ColorPicker({
      color: this.getValue().color,
      onChange: function(hsb, hex, rgb) {
        me.setValue({ color:'#' + hex }, true);
      }
    });

    if (this.params_.alpha) {
      this.alphaEl_ = $('<div>')
        .addClass('form-color-alpha')
        .slider({
          min: 0,
          max: 100,
          range: 'min',
          value: this.getValue().alpha,
    			slide: function(evt, ui) {
    				me.setValue({ alpha: ui.value }, true);
    			}
        })
        .appendTo(fieldContainer);
    }
  },

  getValue: function() {
    var color = this.value_ || this.params_.defaultValue || '#000000';
    if (/^([0-9a-f]{6}|[0-9a-f]{3})$/i.test(color)) {
      color = '#' + color;
    }

    var alpha = this.alpha_;
    if (typeof alpha != 'number') {
      alpha = this.params_.defaultAlpha;
      if (typeof alpha != 'number')
        alpha = 100;
    }

    return { color: color, alpha: alpha };
  },

  setValue: function(val, pauseUi) {
    val = val || {};
    if ('color' in val) {
      this.value_ = val.color;
    }
    if ('alpha' in val) {
      this.alpha_ = val.alpha;
    }

    var computedValue = this.getValue();
    $('.form-color-preview', this.el_)
        .css('background-color', computedValue.color);
    if (!pauseUi) {
      $(this.el_).ColorPickerSetColor(computedValue.color);
      if (this.alphaEl_) {
        $(this.alphaEl_).slider('value', computedValue.alpha);
      }
    }
    this.form_.notifyChanged_(this);
  },

  serializeValue: function() {
    var computedValue = this.getValue();
    return computedValue.color.replace(/^#/, '') + ',' + computedValue.alpha;
  },

  deserializeValue: function(s) {
    var val = {};
    var arr = s.split(',', 2);
    if (arr.length >= 1) {
      val.color = arr[0];
    }
    if (arr.length >= 2) {
      val.alpha = parseInt(arr[1], 10);
    }
    this.setValue(val);
  }
});
*/
studio.forms.ColorField = studio.forms.Field.extend({
  createUI: function(container) {
    var fieldContainer = $('.form-field-container', this.base(container));
    var me = this;
    this.el_ = $('<input>')
      .addClass('form-color')
      .attr('type', 'text')
      .attr('id', this.getHtmlId())
      .css('background-color', this.getValue().color)
      .appendTo(fieldContainer);

    this.el_.spectrum({
      color: this.getValue().color,
      showInput: true,
      showPalette: true,
      preferredFormat: "hex6",
      showSelectionPalette: true,
      //maxPaletteSize: 10,
      palette: [
        ['#ffffff', '#000000'],
        ['#33b5e5', '#0099cc'],
        ['#aa66cc', '#9933cc'],
        ['#99cc00', '#669900'],
        ['#ffbb33', '#ff8800'],
        ['#ff4444', '#cc0000']
      ],
      localStorageKey: 'recentcolors',
      showInitial: true,
      showButtons: false,
      change: function(color) {
        me.setValue({ color: color.toHexString() }, true);
      }
    });

    if (this.params_.alpha) {
      this.alphaEl_ = $('<input>')
        .attr('type', 'range')
        .attr('min', 0)
        .attr('max', 100)
        .val(this.getValue().alpha)
        .addClass('form-range')
        .change(function() {
                        me.setValue({ alpha: Number(me.alphaEl_.val()) }, true);
        })
        .appendTo(fieldContainer);

      this.alphaTextEl_ = $('<div>')
        .addClass('form-range-text')
        .text(this.getValue().alpha + '%')
        .appendTo(fieldContainer);
    }
  },

  getValue: function() {
    var color = this.value_ || this.params_.defaultValue || '#000000';
    if (/^([0-9a-f]{6}|[0-9a-f]{3})$/i.test(color)) {
      color = '#' + color;
    }

    var alpha = this.alpha_;
    if (typeof alpha != 'number') {
      alpha = this.params_.defaultAlpha;
      if (typeof alpha != 'number')
        alpha = 100;
    }

    return { color: color, alpha: alpha };
  },

  setValue: function(val, pauseUi) {
    val = val || {};
    if ('color' in val) {
      this.value_ = val.color;
    }
    if ('alpha' in val) {
      this.alpha_ = val.alpha;
    }

    var computedValue = this.getValue();
    this.el_.css('background-color', computedValue.color);
    if (!pauseUi) {
      $(this.el_).spectrum('set', computedValue.color);
      if (this.alphaEl_) {
        this.alphaEl_.val(computedValue.alpha);
      }
    }
    if (this.alphaTextEl_) {
      this.alphaTextEl_.text(computedValue.alpha + '%');
    }
    this.form_.notifyChanged_(this);
  },

  serializeValue: function() {
    var computedValue = this.getValue();
    return computedValue.color.replace(/^#/, '') + ',' + computedValue.alpha;
  },

  deserializeValue: function(s) {
    var val = {};
    var arr = s.split(',', 2);
    if (arr.length >= 1) {
      val.color = arr[0];
    }
    if (arr.length >= 2) {
      val.alpha = parseInt(arr[1], 10);
    }
    this.setValue(val);
  }
});


studio.forms.EnumField = studio.forms.Field.extend({
  createUI: function(container) {
    var fieldContainer = $('.form-field-container', this.base(container));
    var me = this;

    if (this.params_.buttons) {
      this.el_ = $('<div>')
        .attr('id', this.getHtmlId())
        .addClass('.form-field-buttonset')
        .appendTo(fieldContainer);
      for (var i = 0; i < this.params_.options.length; i++) {
        var option = this.params_.options[i];
        $('<input>')
          .attr({
            type: 'radio',
            name: this.getHtmlId(),
            id: this.getHtmlId() + '-' + option.id,
            value: option.id
          })
          .change(function() {
            me.setValueInternal_($(this).val(), true);
          })
          .appendTo(this.el_);
        $('<label>')
          .attr('for', this.getHtmlId() + '-' + option.id)
          .html(option.title)
          .appendTo(this.el_);
      }
      this.setValueInternal_(this.getValue());
      this.el_.buttonset();
    } else {
      this.el_ = $('<select>')
        .attr('id', this.getHtmlId())
        .change(function() {
          me.setValueInternal_($(this).val(), true);
        })
        .appendTo(fieldContainer);
      for (var i = 0; i < this.params_.options.length; i++) {
        var option = this.params_.options[i];
        $('<option>')
          .attr('value', option.id)
          .text(option.title)
          .appendTo(this.el_);
      }

      this.el_.combobox({
        selected: function(evt, data) {
          me.setValueInternal_(data.item.value, true);
          me.form_.notifyChanged_(me);
        }
      });
      this.setValueInternal_(this.getValue());
    }
  },

  getValue: function() {
    var value = this.value_;
    if (value === undefined) {
      value = this.params_.defaultValue || this.params_.options[0].id;
    }
    return value;
  },

  setValue: function(val, pauseUi) {
    this.setValueInternal_(val, pauseUi);
  },

  setValueInternal_: function(val, pauseUi) {
    // Note, this needs to be its own function because setValue gets
    // overridden in BooleanField and we need access to this method
    // from createUI.
    this.value_ = val;
    if (!pauseUi) {
      if (this.params_.buttons) {
        $('input', this.el_).each(function(i, el) {
          $(el).attr('checked', $(el).val() == val);
        });
        $(this.el_).buttonset('refresh');
      } else {
        this.el_.val(val);
      }
    }
    this.form_.notifyChanged_(this);
  },

  serializeValue: function() {
    return this.getValue();
  },

  deserializeValue: function(s) {
    this.setValue(s);
  }
});

studio.forms.BooleanField = studio.forms.EnumField.extend({
  constructor: function(id, params) {
    params.options = [
      { id: '1', title: params.onText || 'Yes' },
      { id: '0', title: params.offText || 'No' }
    ];
    params.defaultValue = params.defaultValue ? '1' : '0';
    params.buttons = true;
    this.base(id, params);
  },

  getValue: function() {
    return this.base() == '1';
  },

  setValue: function(val, pauseUi) {
    this.base(val ? '1' : '0', pauseUi);
  },

  serializeValue: function() {
    return this.getValue() ? '1' : '0';
  },

  deserializeValue: function(s) {
    this.setValue(s == '1');
  }
});

studio.forms.RangeField = studio.forms.Field.extend({
  createUI: function(container) {
    var fieldContainer = $('.form-field-container', this.base(container));
    var me = this;

    this.el_ = $('<div>')
      .addClass('form-range')
      .slider({
        min: this.params_.min || 0,
        max: this.params_.max || 100,
        step: this.params_.step || 1,
        range: 'min',
        value: this.getValue(),
  			slide: function(evt, ui) {
  				me.setValue(ui.value, true);
  			}
      })
      .appendTo(fieldContainer);

    if (this.params_.textFn || this.params_.showText) {
      this.params_.textFn = this.params_.textFn || function(d){ return d; };
      this.textEl_ = $('<div>')
        .addClass('form-range-text')
        .text(this.params_.textFn(this.getValue()))
        .appendTo(fieldContainer);
    }
  },

  getValue: function() {
    var value = this.value_;
    if (typeof value != 'number') {
      value = this.params_.defaultValue;
      if (typeof value != 'number')
        value = 0;
    }
    return value;
  },

  setValue: function(val, pauseUi) {
    this.value_ = val;
    if (!pauseUi) {
      $(this.el_).slider('value', val);
    }
		if (this.textEl_) {
		  this.textEl_.text(this.params_.textFn(val));
	  }
		this.form_.notifyChanged_(this);
  },

  serializeValue: function() {
    return this.getValue().toString();
  },

  deserializeValue: function(s) {
    this.setValue(Number(s)); // don't use parseInt nor parseFloat
  }
});

studio.hash = {};

studio.hash.boundFormOldOnChange_ = null;
studio.hash.boundForm_ = null;
studio.hash.currentParams_ = {};
studio.hash.currentHash_ = null; // The URI encoded, currently loaded state.

studio.hash.bindFormToDocumentHash = function(form) {
  if (!studio.hash.boundForm_) {
    // Checks for changes in the document hash
    // and reloads the form if necessary.
    var hashChecker_ = function() {
      // Don't use document.location.hash because it automatically
      // resolves URI-escaped entities.
      var docHash = studio.hash.paramsToHash(studio.hash.hashToParams(
          (document.location.href.match(/#.*/) || [''])[0]));

      if (docHash != studio.hash.currentHash_) {
        var newHash = docHash;
        var newParams = studio.hash.hashToParams(newHash);

        studio.hash.onHashParamsChanged_(newParams);
        studio.hash.currentParams_ = newParams;
        studio.hash.currentHash_ = newHash;
      };

      window.setTimeout(hashChecker_, 100);
    }

    window.setTimeout(hashChecker_, 0);
  }

  if (studio.hash.boundFormOldOnChange_ && studio.hash.boundForm_) {
    studio.hash.boundForm_.onChange = studio.hash.boundFormOldOnChange_;
  }

  studio.hash.boundFormOldOnChange_ = form.onChange;

  studio.hash.boundForm_ = form;
  var formChangeTimeout = null;
  studio.hash.boundForm_.onChange = function() {
    if (formChangeTimeout) {
      window.clearTimeout(formChangeTimeout);
    }
    formChangeTimeout = window.setTimeout(function() {
      studio.hash.onFormChanged_();
    }, 500);
    (studio.hash.boundFormOldOnChange_ || function(){}).apply(form, arguments);
  };
};

studio.hash.onHashParamsChanged_ = function(newParams) {
  if (studio.hash.boundForm_) {
    studio.hash.boundForm_.setValuesSerialized(newParams);
  }
};

studio.hash.onFormChanged_ = function() {
  if (studio.hash.boundForm_) {
    // We set this to prevent feedback in the hash checker.
    studio.hash.currentParams_ = studio.hash.boundForm_.getValuesSerialized();
    studio.hash.currentHash_ = studio.hash.paramsToHash(
        studio.hash.currentParams_);
    document.location.hash = studio.hash.currentHash_;
  }
};

studio.hash.hashToParams = function(hash) {
  var params = {};
  hash = hash.replace(/^[?#]/, '');

  var pairs = hash.split('&');
  for (var i = 0; i < pairs.length; i++) {
    var parts = pairs[i].split('=', 2);

    // Most of the time path == key, but for objects like a.b=1, we need to
    // descend into the hierachy.
    var path = parts[0] ? decodeURIComponent(parts[0]) : parts[0];
    var val = parts[1] ? decodeURIComponent(parts[1]) : parts[1];
    var pathArr = path.split('.');
    var obj = params;
    for (var j = 0; j < pathArr.length - 1; j++) {
      obj[pathArr[j]] = obj[pathArr[j]] || {};
      obj = obj[pathArr[j]];
    }
    var key = pathArr[pathArr.length - 1];
    if (key in obj) {
      // Handle array values.
      if (obj[key] && obj[key].splice) {
        obj[key].push(val);
      } else {
        obj[key] = [obj[key], val];
      }
    } else {
      obj[key] = val;
    }
  }

  return params;
};

studio.hash.paramsToHash = function(params, prefix) {
  var hashArr = [];

  var keyPath_ = function(k) {
    return encodeURIComponent((prefix ? prefix + '.' : '') + k);
  };

  var pushKeyValue_ = function(k, v) {
    if (v === false) v = 0;
    if (v === true)  v = 1;
    hashArr.push(keyPath_(k) + '=' +
                 encodeURIComponent(v.toString()));
  };

  for (var key in params) {
    var val = params[key];
    if (val === undefined || val === null) {
      continue;
    }

    if (typeof val == 'object') {
      if (val.splice && val.length) {
        // Arrays
        for (var i = 0; i < val.length; i++) {
          pushKeyValue_(key, val[i]);
        }
      } else {
        // Objects
        hashArr.push(studio.hash.paramsToHash(val, keyPath_(key)));
      }
    } else {
      // All other values
      pushKeyValue_(key, val);
    }
  }

  return hashArr.join('&');
};


/**
 * This is needed due to what seems like a bug in Chrome where using drawImage
 * with any SVG, regardless of origin (even if it was loaded from a data URI),
 * marks the canvas's origin dirty flag, precluding us from accessing its pixel
 * data.
 */
var USE_CANVG = window.canvg && true;

/**
 * Represents a form field for image values.
 */
studio.forms.ImageField = studio.forms.Field.extend({
  constructor: function(id, params) {
    this.valueType_ = null;
    this.textParams_ = {};
    this.imageParams_ = {};
    this.spaceFormValues_ = {}; // cache
    this.base(id, params);
  },

  createUI: function(container) {
    var fieldUI = this.base(container);
    var fieldContainer = $('.form-field-container', fieldUI);

    var me = this;

    // Set up drag+drop on the entire field container
    fieldUI.addClass('form-field-drop-target');
    fieldUI.get(0).ondragenter = studio.forms.ImageField.makeDragenterHandler_(
      fieldUI);
    fieldUI.get(0).ondragleave = studio.forms.ImageField.makeDragleaveHandler_(
      fieldUI);
    fieldUI.get(0).ondragover = studio.forms.ImageField.makeDragoverHandler_(
      fieldUI);
    fieldUI.get(0).ondrop = studio.forms.ImageField.makeDropHandler_(fieldUI,
      function(evt) {
        studio.forms.ImageField.loadImageFromFileList(evt.dataTransfer.files, function(ret) {
          if (!ret)
            return;

          me.setValueType_('image');
          me.imageParams_ = ret;
          me.valueFilename_ = ret.name;
          me.renderValueAndNotifyChanged_();
        });
      });

    // Create radio buttons
    this.el_ = $('<div>')
      .attr('id', this.getHtmlId())
      .addClass('.form-field-buttonset')
      .appendTo(fieldContainer);

    var types;
    if (this.params_.imageOnly) {
      types = [
        'image', 'Select Image'
      ];
    } else {
      types = [
        'image', 'Image',
        'clipart', 'Clipart',
        'text', 'Text'
      ];
    }

    var typeEls = {};

    for (var i = 0; i < types.length / 2; i++) {
      $('<input>')
        .attr({
          type: 'radio',
          name: this.getHtmlId(),
          id: this.getHtmlId() + '-' + types[i * 2],
          value: types[i * 2]
        })
        .appendTo(this.el_);
      typeEls[types[i * 2]] = $('<label>')
        .attr('for', this.getHtmlId() + '-' + types[i * 2])
        .text(types[i * 2 + 1])
        .appendTo(this.el_);
    }

    this.el_.buttonset();

    // Prepare UI for the 'image' type
    this.fileEl_ = $('<input>')
      .addClass('form-image-hidden-file-field')
      .attr({
        id: this.getHtmlId(),
        type: 'file',
        accept: 'image/*'
      })
      .change(function() {
        studio.forms.ImageField.loadImageFromFileList(me.fileEl_.get(0).files, function(ret) {
          if (!ret)
            return;

          me.setValueType_('image');
          me.imageParams_ = ret;
          me.valueFilename_ = ret.name;
          me.renderValueAndNotifyChanged_();
        });
      })
      .appendTo(this.el_);

    typeEls.image.click(function(evt) {
      me.fileEl_.trigger('click');
      me.setValueType_(null);
      me.renderValueAndNotifyChanged_();
      evt.preventDefault();
      return false;
    });

    // Prepare UI for the 'clipart' type
    if (!this.params_.imageOnly) {
      var clipartParamsEl = $('<div>')
        .addClass('form-image-type-params form-image-type-params-clipart')
        .hide()
        .appendTo(this.el_);

      var clipartListEl = $('<div>')
        .addClass('form-image-clipart-list')
        .appendTo(clipartParamsEl);

      for (var i = 0; i < studio.forms.ImageField.clipartList_.length; i++) {
        var clipartSrc = 'res/clipart/' + studio.forms.ImageField.clipartList_[i];
        $('<img>')
          .addClass('form-image-clipart-item')
          .attr('src', clipartSrc)
          .click(function(clipartSrc) {
            return function() {
              me.loadClipart_(clipartSrc);
            };
          }(clipartSrc))
          .appendTo(clipartListEl);
      }

      var clipartAttributionEl = $('<div>')
        .addClass('form-image-clipart-attribution')
        .html([
            'Clipart courtesy of ',
            '<a href="http://www.yay.se/2011/02/',
                'native-android-icons-in-vector-format/"',
            ' target="_blank">Olof Brickarp</a>.'
          ].join(''))
        .appendTo(clipartParamsEl);

      typeEls.clipart.click(function(evt) {
        me.setValueType_('clipart');
        me.renderValueAndNotifyChanged_();
      });

      // Prepare UI for the 'text' type
      var textParamsEl = $('<div>')
        .addClass(
          'form-subform ' +
          'form-image-type-params ' +
          'form-image-type-params-text')
        .hide()
        .appendTo(this.el_);

      this.textForm_ = new studio.forms.Form(
        this.form_.id_ + '-' + this.id_ + '-textform', {
          onChange: function() {
            var values = me.textForm_.getValues();
            me.textParams_.text = values['text'];
            me.textParams_.fontStack = values['font']
                ? values['font'] : 'sans-serif';
            me.valueFilename_ = values['text'];
            me.tryLoadWebFont_();
            me.renderValueAndNotifyChanged_();
          },
          fields: [
            new studio.forms.TextField('text', {
              title: 'Text',
            }),
            new studio.forms.AutocompleteTextField('font', {
              title: 'Font',
              items: studio.forms.ImageField.fontList_
            })
          ]
        });
      this.textForm_.createUI(textParamsEl);

      typeEls.text.click(function(evt) {
        me.setValueType_('text');
        me.renderValueAndNotifyChanged_();
      });
    }

    // Create spacing subform
    if (!this.params_.noTrimForm) {
      this.spaceFormValues_ = {};
      this.spaceForm_ = new studio.forms.Form(
        this.form_.id_ + '-' + this.id_ + '-spaceform', {
          onChange: function() {
            me.spaceFormValues_ = me.spaceForm_.getValues();
            me.renderValueAndNotifyChanged_();
          },
          fields: [
            new studio.forms.BooleanField('trim', {
              title: 'Trim',
              defaultValue: this.params_.defaultValueTrim || false,
              offText: 'Don\'t Trim',
              onText: 'Trim'
            }),
            new studio.forms.RangeField('pad', {
              title: 'Padding',
              defaultValue: 0,
              min: -0.1,
              max: 0.5, // 1/2 of min(width, height)
              step: 0.05,
              textFn: function(v) {
                return (v * 100) + '%';
              }
            }),
          ]
        });
      this.spaceForm_.createUI($('<div>')
        .addClass('form-subform')
        .appendTo(fieldContainer));
      this.spaceFormValues_ = this.spaceForm_.getValues();
    } else {
      this.spaceFormValues_ = {};
    }

    // Create image preview element
    if (!this.params_.noPreview) {
      this.imagePreview_ = $('<canvas>')
        .addClass('form-image-preview')
        .hide()
        .appendTo(fieldContainer.parent());
    }
  },

  tryLoadWebFont_: function(force) {
    var desiredFont = this.textForm_.getValues()['font'];
    if (this.loadedWebFont_ == desiredFont) {
      return;
    }

    var me = this;
    if (!force) {
      if (this.tryLoadWebFont_.timeout_) {
        clearTimeout(this.tryLoadWebFont_.timeout_);
      }
      this.tryLoadWebFont_.timeout_ = setTimeout(function() {
        me.tryLoadWebFont_(true);
      }, 100);
      return;
    }

    this.loadedWebFont_ = desiredFont;
    var webFontNodeId = this.form_.id_ + '-' + this.id_ + '-__webfont-stylesheet__';
    var $webFontNode = $('#' + webFontNodeId);
    if (!$webFontNode.length) {
      $webFontNode = $('<link>')
          .attr('id', webFontNodeId)
          .attr('rel', 'stylesheet')
          .appendTo('head');
    }
    $webFontNode.attr(
        'href', 'http://fonts.googleapis.com/css?family='
            + encodeURIComponent(desiredFont));
  },

  setValueType_: function(type) {
    this.valueType_ = type;
    $('label', this.el_).removeClass('ui-state-active');
    $('.form-image-type-params', this.el_).hide();
    if (type) {
      $('label[for=' + this.getHtmlId() + '-' + type + ']').addClass('ui-state-active');
      $('.form-image-type-params-' + type, this.el_).show();
    }
  },

  loadClipart_: function(clipartSrc) {
    var useCanvg = USE_CANVG && clipartSrc.match(/\.svg$/);

    $('img.form-image-clipart-item', this.el_).removeClass('selected');
    $('img[src="' + clipartSrc + '"]').addClass('selected');
    
    this.imageParams_ = {
      canvgSvgUri: useCanvg ? clipartSrc : null,
      uri: useCanvg ? null : clipartSrc
    };
    this.clipartSrc_ = clipartSrc;
    this.valueFilename_ = clipartSrc.match(/[^/]+$/)[0];
    this.renderValueAndNotifyChanged_();
  },

  clearValue: function() {
    this.valueType_ = null;
    this.valueFilename_ = null;
    this.valueCtx_ = null;
    this.fileEl_.val('');
    if (this.imagePreview_) {
      this.imagePreview_.hide();
    }
  },

  getValue: function() {
    return {
      ctx: this.valueCtx_,
      name: this.valueFilename_
    };
  },

  // this function is asynchronous
  renderValueAndNotifyChanged_: function() {
    if (!this.valueType_) {
      this.valueCtx_ = null;
    }

    var me = this;

    // Render the base image (text, clipart, or image)
    switch (this.valueType_) {
      case 'image':
      case 'clipart':
        if (this.imageParams_.canvgSvgText || this.imageParams_.canvgSvgUri) {
          var canvas = document.createElement('canvas');
          var size = { w: 800, h: 800 };
          canvas.className = 'offscreen';
          canvas.width = size.w;
          canvas.height = size.h;
          document.body.appendChild(canvas);

          canvg(
            canvas,
            this.imageParams_.canvgSvgText ||
              this.imageParams_.canvgSvgUri,
            {
              scaleWidth: size.w,
              scaleHeight: size.h,
              ignoreMouse: true,
              ignoreAnimation: true,
              ignoreDimensions: true,
              ignoreClear: true
            }
          );
          continue_(canvas.getContext('2d'), size);

          document.body.removeChild(canvas);
        } else if (this.imageParams_.uri) {
          imagelib.loadFromUri(this.imageParams_.uri, function(img) {
            var size = {
              w: img.naturalWidth,
              h: img.naturalHeight
            };
            var ctx = imagelib.drawing.context(size);
            imagelib.drawing.copy(ctx, img, size);
            continue_(ctx, size);
          });
        }
        break;

      case 'text':
        var size = { w: 4800, h: 1600 };
        var textHeight = size.h * 0.75;
        var ctx = imagelib.drawing.context(size);
        var text = this.textParams_.text || '';
        text = ' ' + text + ' ';

        ctx.fillStyle = '#000';
        ctx.font = 'bold ' + textHeight + 'px/' + size.h + 'px ' +
                    (this.textParams_.fontStack || 'sans-serif');
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(text, 0, textHeight);
        size.w = Math.ceil(Math.min(ctx.measureText(text).width, size.w) || size.w);

        continue_(ctx, size);
        break;

      default:
        me.form_.notifyChanged_(me);
    }

    function continue_(srcCtx, srcSize) {
      // Apply trimming
      if (me.spaceFormValues_['trim']) {
        if (me.trimWorker_) {
          me.trimWorker_.terminate();
        }
        me.trimWorker_ = imagelib.drawing.getTrimRect(srcCtx, srcSize, 1,
            function(trimRect) {
              continue2_(srcCtx, srcSize, trimRect);
            });
      } else {
        continue2_(srcCtx, srcSize,
            /*trimRect*/{ x: 0, y: 0, w: srcSize.w, h: srcSize.h });
      }
    }

    function continue2_(srcCtx, srcSize, trimRect) {
      // If trimming, add a tiny bit of padding to fix artifacts around the
      // edges.
      var extraPadding = me.spaceFormValues_['trim'] ? 0.001 : 0;
      if (trimRect.x == 0 && trimRect.y == 0 &&
          trimRect.w == srcSize.w && trimRect.h == srcSize.h) {
        extraPadding = 0;
      }

      var padPx = Math.round(((me.spaceFormValues_['pad'] || 0) + extraPadding) *
                  Math.min(trimRect.w, trimRect.h));
      var targetRect = { x: padPx, y: padPx, w: trimRect.w, h: trimRect.h };

      var outCtx = imagelib.drawing.context({
        w: trimRect.w + padPx * 2,
        h: trimRect.h + padPx * 2
      });

      // TODO: replace with a simple draw() as the centering is useless
      imagelib.drawing.drawCenterInside(outCtx, srcCtx, targetRect, trimRect);

      // Set the final URI value and show a preview
      me.valueCtx_ = outCtx;

      if (me.imagePreview_) {
        me.imagePreview_.attr('width', outCtx.canvas.width);
        me.imagePreview_.attr('height', outCtx.canvas.height);

        var previewCtx = me.imagePreview_.get(0).getContext('2d');
        previewCtx.drawImage(outCtx.canvas, 0, 0);

        me.imagePreview_.show();
      }

      me.form_.notifyChanged_(me);
    }
  },

  serializeValue: function() {
    return {
      type: this.valueType_,
      space: this.spaceForm_.getValuesSerialized(),
      clipart: (this.valueType_ == 'clipart') ? this.clipartSrc_ : null,
      text: (this.valueType_ == 'text') ? this.textForm_.getValuesSerialized()
                                        : null
    };
  },

  deserializeValue: function(o) {
    if (o.type) {
      this.setValueType_(o.type);
    }
    if (o.space) {
      this.spaceForm_.setValuesSerialized(o.space);
      this.spaceFormValues_ = this.spaceForm_.getValues();
    }
    if (o.clipart && this.valueType_ == 'clipart') {
      this.loadClipart_(o.clipart);
    }
    if (o.text && this.valueType_ == 'text') {
      this.textForm_.setValuesSerialized(o.text);
      this.tryLoadWebFont_();
    }
  }
});

studio.forms.ImageField.clipartList_ = [
  'icons/accounts.svg',
  'icons/add.svg',
  'icons/agenda.svg',
  'icons/all_friends.svg',
  'icons/attachment.svg',
  'icons/back.svg',
  'icons/backspace.svg',
  'icons/barcode.svg',
  'icons/battery_charging.svg',
  'icons/bell.svg',
  'icons/block.svg',
  'icons/block_user.svg',
  'icons/bookmarks.svg',
  'icons/camera.svg',
  'icons/circle_arrow.svg',
  'icons/clock.svg',
  'icons/compass.svg',
  'icons/cross.svg',
  'icons/cross2.svg',
  'icons/directions.svg',
  'icons/down_arrow.svg',
  'icons/edit.svg',
  'icons/expand_arrows.svg',
  'icons/export.svg',
  'icons/eye.svg',
  'icons/gallery.svg',
  'icons/group.svg',
  'icons/happy_droid.svg',
  'icons/help.svg',
  'icons/home.svg',
  'icons/info.svg',
  'icons/key.svg',
  'icons/list.svg',
  'icons/lock.svg',
  'icons/mail.svg',
  'icons/map.svg',
  'icons/map_pin.svg',
  'icons/mic.svg',
  'icons/notification.svg',
  'icons/phone.svg',
  'icons/play_clip.svg',
  'icons/plus.svg',
  'icons/position.svg',
  'icons/power.svg',
  'icons/refresh.svg',
  'icons/search.svg',
  'icons/settings.svg',
  'icons/share.svg',
  'icons/slideshow.svg',
  'icons/sort_by_size.svg',
  'icons/sound_full.svg',
  'icons/sound_off.svg',
  'icons/star.svg',
  'icons/stars_grade.svg',
  'icons/stop.svg',
  'icons/trashcan.svg',
  'icons/usb.svg',
  'icons/user.svg',
  'icons/warning.svg'
];

studio.forms.ImageField.fontList_ = [
  'Helvetica',
  'Arial',
  'Georgia',
  'Book Antiqua',
  'Palatino',
  'Courier',
  'Courier New',
  'Webdings',
  'Wingdings'
];

/**
 * Loads the first valid image from a FileList (e.g. drag + drop source), as a data URI. This method
 * will throw an alert() in case of errors and call back with null.
 * @param {FileList} fileList The FileList to load.
 * @param {Function} callback The callback to fire once image loading is done (or fails).
 * @return Returns an object containing 'uri' or 'canvgSvgText' fields representing
 *      the loaded image. There will also be a 'name' field indicating the file name, if one
 *      is available.
 */
studio.forms.ImageField.loadImageFromFileList = function(fileList, callback) {
  fileList = fileList || [];

  var file = null;
  for (var i = 0; i < fileList.length; i++) {
    if (studio.forms.ImageField.isValidFile_(fileList[i])) {
      file = fileList[i];
      break;
    }
  }

  if (!file) {
    alert('Please choose a valid image file (PNG, JPG, GIF, SVG, etc.)');
    callback(null);
    return;
  }

  var useCanvg = USE_CANVG && file.type == 'image/svg+xml';

  var fileReader = new FileReader();

  // Closure to capture the file information.
  fileReader.onload = function(e) {
    callback({
      uri: useCanvg ? null : e.target.result,
      canvgSvgText: useCanvg ? e.target.result : null,
      name: file.name
    });
  };
  fileReader.onerror = function(e) {
    switch(e.target.error.code) {
      case e.target.error.NOT_FOUND_ERR:
        alert('File not found!');
        break;
      case e.target.error.NOT_READABLE_ERR:
        alert('File is not readable');
        break;
      case e.target.error.ABORT_ERR:
        break; // noop
      default:
        alert('An error occurred reading this file.');
    }
    callback(null);
  };
  /*fileReader.onprogress = function(e) {
    $('#read-progress').css('visibility', 'visible');
    // evt is an ProgressEvent.
    if (e.lengthComputable) {
      $('#read-progress').val(Math.round((e.loaded / e.total) * 100));
    } else {
      $('#read-progress').removeAttr('value');
    }
  };*/
  fileReader.onabort = function(e) {
    alert('File read cancelled');
    callback(null);
  };
  /*fileReader.onloadstart = function(e) {
    $('#read-progress').css('visibility', 'visible');
  };*/
  if (useCanvg)
    fileReader.readAsText(file);
  else
    fileReader.readAsDataURL(file);
};

/**
 * Determines whether or not the given File is a valid value for the image.
 * 'File' here is a File using the W3C File API.
 * @private
 * @param {File} file Describe this parameter
 */
studio.forms.ImageField.isValidFile_ = function(file) {
  return !!file.type.toLowerCase().match(/^image\//);
};
/*studio.forms.ImageField.isValidFile_.allowedTypes = {
  'image/png': true,
  'image/jpeg': true,
  'image/svg+xml': true,
  'image/gif': true,
  'image/vnd.adobe.photoshop': true
};*/

studio.forms.ImageField.makeDropHandler_ = function(el, handler) {
  return function(evt) {
    $(el).removeClass('drag-hover');
    handler(evt);
  };
};

studio.forms.ImageField.makeDragoverHandler_ = function(el) {
  return function(evt) {
    el = $(el).get(0);
    if (el._studio_frm_dragtimeout_) {
      window.clearTimeout(el._studio_frm_dragtimeout_);
      el._studio_frm_dragtimeout_ = null;
    }
    evt.dataTransfer.dropEffect = 'link';
    evt.preventDefault();
  };
};

studio.forms.ImageField.makeDragenterHandler_ = function(el) {
  return function(evt) {
    el = $(el).get(0);
    if (el._studio_frm_dragtimeout_) {
      window.clearTimeout(el._studio_frm_dragtimeout_);
      el._studio_frm_dragtimeout_ = null;
    }
    $(el).addClass('drag-hover');
    evt.preventDefault();
  };
};

studio.forms.ImageField.makeDragleaveHandler_ = function(el) {
  return function(evt) {
    el = $(el).get(0);
    if (el._studio_frm_dragtimeout_)
      window.clearTimeout(el._studio_frm_dragtimeout_);
    el._studio_frm_dragtimeout_ = window.setTimeout(function() {
      $(el).removeClass('drag-hover');
    }, 100);
  };
};

studio.ui = {};

studio.ui.createImageOutputGroup = function(params) {
  return $('<div>')
    .addClass('out-image-group')
    .append($('<div>')
      .addClass('label')
      .text(params.label))
    .appendTo(params.container);
};


studio.ui.createImageOutputSlot = function(params) {
  return $('<div>')
    .addClass('out-image-block')
    .append($('<div>')
      .addClass('label')
      .text(params.label))
    .append($('<img>')
      .addClass('out-image')
      .attr('id', params.id))
    .appendTo(params.container);
};


studio.ui.drawImageGuideRects = function(ctx, size, guides) {
  guides = guides || [];

  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size.w, size.h);
  ctx.globalAlpha = 1.0;

  var guideColors = studio.ui.drawImageGuideRects.guideColors_;

  for (var i = 0; i < guides.length; i++) {
    ctx.strokeStyle = guideColors[(i - 1) % guideColors.length];
    ctx.strokeRect(guides[i].x + 0.5, guides[i].y + 0.5, guides[i].w - 1, guides[i].h - 1);
  }

  ctx.restore();
};
studio.ui.drawImageGuideRects.guideColors_ = [
  '#f00'
];

studio.ui.setupDragout = function() {
  if (studio.ui.setupDragout.completed_) {
    return;
  }
  studio.ui.setupDragout.completed_ = true;

  $(document).ready(function() {
    document.body.addEventListener('dragstart', function(e) {
      var a = e.target;
      if (a.classList.contains('dragout')) {
        e.dataTransfer.setData('DownloadURL', a.dataset.downloadurl);
      }
    }, false);
  });
};

studio.util = {};

studio.util.getMultBaseMdpi = function(density) {
  switch (density) {
    case 'xhdpi': return 2.00;
    case  'hdpi': return 1.50;
    case  'mdpi': return 1.00;
    case  'ldpi': return 0.75;
  }
  return 1.0;
};

studio.util.mult = function(s, mult) {
  var d = {};
  for (k in s) {
    d[k] = s[k] * mult;
  }
  return d;
};

studio.util.multRound = function(s, mult) {
  var d = {};
  for (k in s) {
    d[k] = Math.round(s[k] * mult);
  }
  return d;
};

studio.zip = {};

(function() {
  /**
   * Converts a base64 string to a Blob
   */
  function base64ToBlob_(base64, mimetype) {
    var BASE64_MARKER = ';base64,';
    var raw = window.atob(base64);
    var rawLength = raw.length;
    var uInt8Array = new Uint8Array(rawLength);
    for (var i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }

    if (imagelib.util.hasBlobConstructor()) {
      return new Blob([uInt8Array], {type: mimetype})
    }

    var bb = new BlobBuilder();
    bb.append(uInt8Array.buffer);
    return bb.getBlob(mimetype);
  }

  /**
   * Gets the base64 string for the Zip file specified by the
   * zipperHandle (an Asset Studio-specific thing).
   */
  function getZipperBase64Contents(zipperHandle) {
    if (!zipperHandle.fileSpecs_.length)
      return '';

    var zip = new JSZip();
    for (var i = 0; i < zipperHandle.fileSpecs_.length; i++) {
      var fileSpec = zipperHandle.fileSpecs_[i];
      if (fileSpec.base64data)
        zip.add(fileSpec.name, fileSpec.base64data, {base64:true});
      else if (fileSpec.textData)
        zip.add(fileSpec.name, fileSpec.textData);
    }
    return zip.generate();
  }

  window.URL = window.URL || window.webkitURL || window.mozURL;
  window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder ||
                       window.MozBlobBuilder;

  studio.zip.createDownloadifyZipButton = function(element, options) {
    // TODO: badly needs to be documented :-)

    var zipperHandle = {
      fileSpecs_: []
    };

    var link = $('<a>')
        .addClass('dragout')
        .addClass('form-button')
        .attr('disabled', 'disabled')
        .text('Download .ZIP')
        .get(0);

    $(element).replaceWith(link);

    var updateZipTimeout_ = null;

    function updateZip_(now) {
      // this is immediate

      if (link.href) {
        window.URL.revokeObjectURL(link.href);
        link.href = null;
      }

      if (!now) {
        $(link).attr('disabled', 'disabled');

        if (updateZipTimeout_) {
          window.clearTimeout(updateZipTimeout_);
        }

        updateZipTimeout_ = window.setTimeout(function() {
          updateZip_(true);
          updateZipTimeout_ = null;
        }, 500)
        return;
      }

      // this happens on a timeout for throttling

      var filename = zipperHandle.zipFilename_ || 'output.zip';
      if (!zipperHandle.fileSpecs_.length) {
        //alert('No ZIP file data created.');
        return;
      }

      link.download = filename;
      link.href = window.URL.createObjectURL(base64ToBlob_(
          getZipperBase64Contents(zipperHandle),
          'application/zip'));
      link.draggable = true;
      link.dataset.downloadurl = ['application/zip', link.download, link.href].join(':');

      $(link).removeAttr('disabled');
    }

    // Set up zipper control functions
    zipperHandle.setZipFilename = function(zipFilename) {
      zipperHandle.zipFilename_ = zipFilename;
      updateZip_();
    };
    zipperHandle.clear = function() {
      zipperHandle.fileSpecs_ = [];
      updateZip_();
    };
    zipperHandle.add = function(spec) {
      zipperHandle.fileSpecs_.push(spec);
      updateZip_();
    };

    return zipperHandle;
  };

  // Requires the body listener to be set up
  studio.ui.setupDragout();
})();

window.studio = studio;

})();
