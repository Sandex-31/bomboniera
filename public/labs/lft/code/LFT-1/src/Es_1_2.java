public class Es_1_2 {
    public static void main(String[] args) throws Exception {
        String[] array = {"x", "flag1", "x2y2", "x_1", "lft_lab", "_temp", "x_1_y_2",
            "x___", "__5","5", "221B", "123", "9_to_5", "___"};
        for(int j = 0; j < 14; j++){
            String str = array[j];
            int state = 0;
            int i = 0;
            while(state >= 0 && i<str.length()){
                final char ch = str.charAt(i++);
                switch(state){
                    case 0:
                        if(Character.isDigit(ch)){
                            state = 2;
                        }else if(Character.isLetter(ch)){
                            state = 1;
                        }else if(ch == '_'){
                            state = 3;
                        }else
                            state = -1;
                    break;
                    case 1:
                        if(Character.isLetterOrDigit(ch) || ch == '_'){
                            state = 4;
                        }else{
                            state = -1;
                        }
                    break;
                    case 2:
                        state = -1;
                    break;
                    case 3:
                        if(Character.isLetterOrDigit(ch)){
                            state = 4;
                        }
                    break;
                    case 4:
                        
                    break;
                }
            }
            System.out.println("[" + array[j] + "] " + "-> " + (state == 4 || state == 1));
        }
    }
}
