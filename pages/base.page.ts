
import { expect,Locator, Page} from "@playwright/test"
import { PAGE_LOGO_TEXT } from "../utils/base.data";

export abstract class BasePage{

    readonly logo_text:Locator;

    protected constructor (protected readonly page:Page){
        this.logo_text = page.getByText(PAGE_LOGO_TEXT)
    }

    async goto(){
        await this.page.goto("https://www.saucedemo.com")
    }

    async waitForPageLoad(){
        await expect(this.logo_text).toBeVisible();
    }
}