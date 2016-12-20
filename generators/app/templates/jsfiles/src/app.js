
(function()
{
	var Sprite  = Laya.Sprite;
	var Stage   = Laya.Stage;
	var Texture = Laya.Texture;
	var Browser = Laya.Browser;
	var Handler = Laya.Handler;
	var WebGL   = Laya.WebGL;

	(function()
	{
		Laya.init(Browser.clientWidth, Browser.clientHeight, WebGL);

		Laya.stage.alignV = Stage.ALIGN_MIDDLE;
		Laya.stage.alignH = Stage.ALIGN_CENTER;

		Laya.stage.scaleMode = "showall";
		Laya.stage.bgColor = "#232628";

		var ape = new Sprite();
		Laya.stage.addChild(ape);
		ape.loadImage("/res/monkey.png");

		var txt = new Laya.Text();
		txt.text = "Hello Layabox";
		txt.color = "#FF0000";
		txt.fontSize = 30;
		txt.stroke = 5;
		txt.strokeColor = "#FFFFFF";
		txt.bold = true;
		txt.pos(60,100);
		Laya.stage.addChild(txt);
	})();
})();
