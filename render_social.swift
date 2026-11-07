import AppKit
let image = NSImage(size: NSSize(width: 1200, height: 630))
image.lockFocus()
NSColor(calibratedRed:0.96,green:0.95,blue:0.92,alpha:1).setFill()
NSBezierPath(rect:NSRect(x:0,y:0,width:1200,height:630)).fill()
func text(_ value:String,_ x:CGFloat,_ y:CGFloat,_ size:CGFloat,_ color:NSColor,_ weight:NSFont.Weight = .bold){
 value.draw(at:NSPoint(x:x,y:y),withAttributes:[.font:NSFont.systemFont(ofSize:size,weight:weight),.foregroundColor:color])
}
let ink = NSColor(calibratedRed:0.11,green:0.14,blue:0.15,alpha:1)
let orange = NSColor(calibratedRed:0.73,green:0.28,blue:0.12,alpha:1)
let colors:[NSColor] = [.systemOrange,.systemRed,.systemBlue]
for i in 0..<3 { colors[i].setFill(); NSBezierPath(roundedRect:NSRect(x:65,y:527-CGFloat(i)*13,width:40,height:10),xRadius:5,yRadius:5).fill() }
text("viewography.",120,500,40,ink)
text("More great watching.",60,355,76,ink)
text("Less wasted streaming.",60,264,76,orange)
text("Track TV & movies. Plan what you pay for.",65,180,30,ink,.medium)
text("No accounts. No ads. No tracking.",65,110,22,ink,.semibold)
text("Free during our Founders’ Round · For iPhone",65,63,20,ink,.medium)
image.unlockFocus()
let bitmap = NSBitmapImageRep(data:image.tiffRepresentation!)!
let png = bitmap.representation(using:.png,properties:[:])!
try png.write(to:URL(fileURLWithPath:CommandLine.arguments[1]))
