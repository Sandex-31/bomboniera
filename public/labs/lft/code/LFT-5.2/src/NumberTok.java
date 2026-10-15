public class NumberTok extends Token{
	public int lexeme;
    public NumberTok(int tag, int v) { super(tag); lexeme=v; }
    public String toString() { return "<" + tag + ", " + lexeme + ">"; }
}